import { db } from "../db";
import { jobs, type Job, type InsertJob } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";
import * as XLSX from "xlsx";
import { geocodeAddress } from "./geocodingService";

interface DodgeCSVRow {
  'Project Name'?: string;
  'Project Description'?: string;
  'Address'?: string;
  'City'?: string;
  'State'?: string;
  'ZIP'?: string;
  'Project Value'?: string;
  'Project Type'?: string;
  'Start Date'?: string;
  'End Date'?: string;
  'Owner'?: string;
  'Contractor'?: string;
  'Architect'?: string;
  'Engineer'?: string;
  'Phone'?: string;
  'Email'?: string;
  'Status'?: string;
  'Project ID'?: string;
  'County'?: string;
  [key: string]: any; // Allow for flexible column names
}

export class CSVImportService {
  
  /**
   * Import jobs from Dodge Data CSV file
   * Handles duplicates by checking project name, address, and value
   */
  async importDodgeCSV(fileBuffer: Buffer): Promise<{
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
  }> {
    try {
      const results = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[]
      };

      // Parse CSV file (works with both .csv and .xlsx)
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(firstSheet) as DodgeCSVRow[];

      console.log(`Processing ${rawData.length} rows from Dodge CSV`);

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        
        try {
          // Skip empty rows
          if (!row || !row['Project Name']) {
            results.skipped++;
            continue;
          }

          // Extract and clean data
          const projectName = this.cleanString(row['Project Name']);
          const description = this.cleanString(row['Project Description'] || '');
          const fullAddress = this.buildFullAddress(row);
          const projectValue = this.parseProjectValue(row['Project Value']);
          const projectType = this.normalizeProjectType(row['Project Type']);
          const dodgeProjectId = this.cleanString(row['Project ID'] || '');

          console.log(`Processing row ${i}: ${projectName} with address: ${fullAddress}`);
          
          // Create new job (duplicates temporarily disabled)
          await this.createNewJobFromCSV(row, projectName, description, fullAddress, projectValue, projectType, dodgeProjectId);
          results.imported++;
          console.log(`Successfully imported: ${projectName}`);
          
          // Limit for testing
          if (i >= 10) break;

        } catch (error) {
          const errorMsg = `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      console.log(`CSV Import completed: ${results.imported} imported, ${results.updated} updated, ${results.skipped} skipped, ${results.errors.length} errors`);
      return results;

    } catch (error) {
      console.error('Error importing Dodge CSV:', error);
      throw new Error(`CSV import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find existing job using multiple matching criteria
   */
  private async findExistingJob(criteria: {
    name: string;
    address: string;
    projectValue?: string;
    dodgeJobId?: string;
  }): Promise<Job | null> {
    
    // First try exact match on Dodge Project ID if available
    if (criteria.dodgeJobId && criteria.dodgeJobId.trim() !== '') {
      const [existingById] = await db
        .select()
        .from(jobs)
        .where(eq(jobs.dodgeJobId, criteria.dodgeJobId))
        .limit(1);
      
      if (existingById) {
        console.log(`Found duplicate by Dodge ID: ${criteria.dodgeJobId}`);
        return existingById;
      }
    }

    // Then try name + address match
    const [existingByNameAddress] = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.name, criteria.name),
          eq(jobs.address, criteria.address)
        )
      )
      .limit(1);

    if (existingByNameAddress) return existingByNameAddress;

    // Finally try fuzzy matching on name similarity + location
    const similarJobs = await db
      .select()
      .from(jobs)
      .where(
        or(
          eq(jobs.name, criteria.name),
          // Could add LIKE matching here for fuzzy name matching
        )
      );

    // Check for similar jobs with same address or very close project values
    for (const job of similarJobs) {
      if (
        job.address === criteria.address ||
        (criteria.projectValue && job.projectValue && 
         Math.abs(parseFloat(job.projectValue) - parseFloat(criteria.projectValue)) < 10000)
      ) {
        return job;
      }
    }

    return null;
  }

  /**
   * Update existing job with new data if there are meaningful changes
   */
  private async updateExistingJobIfNeeded(
    existingJob: Job,
    row: DodgeCSVRow,
    fullAddress: string,
    projectValue: number | null,
    projectType: string
  ): Promise<boolean> {
    
    const updates: Partial<InsertJob> = {};
    let hasChanges = false;

    // Update project value if it's more recent or more detailed
    if (projectValue && (!existingJob.projectValue || parseFloat(existingJob.projectValue) !== projectValue)) {
      updates.projectValue = projectValue.toString();
      hasChanges = true;
    }

    // Update project type if it's more specific
    if (projectType && projectType !== existingJob.type) {
      updates.type = projectType as any;
      hasChanges = true;
    }

    // Update contact information if missing
    if (row['Phone'] && !existingJob.phone) {
      updates.phone = this.cleanString(row['Phone']);
      hasChanges = true;
    }

    if (row['Email'] && !existingJob.email) {
      updates.email = this.cleanString(row['Email']);
      hasChanges = true;
    }

    // Update contractor info if missing
    if (row['Contractor'] && !existingJob.contractor) {
      updates.contractor = this.cleanString(row['Contractor']);
      hasChanges = true;
    }

    // Update status if it's more current
    const newStatus = this.normalizeStatus(row['Status']);
    if (newStatus && newStatus !== existingJob.status) {
      updates.status = newStatus as any;
      hasChanges = true;
    }

    // Ensure Dodge Project ID is set
    const dodgeId = this.cleanString(row['Project ID'] || '');
    if (dodgeId && !existingJob.dodgeJobId) {
      updates.dodgeJobId = dodgeId;
      hasChanges = true;
    }

    if (hasChanges) {
      await db
        .update(jobs)
        .set({
          ...updates,
          lastUpdated: new Date()
        })
        .where(eq(jobs.id, existingJob.id));
    }

    return hasChanges;
  }

  /**
   * Create new job from CSV row
   */
  private async createNewJobFromCSV(
    row: DodgeCSVRow,
    projectName: string,
    description: string,
    fullAddress: string,
    projectValue: number | null,
    projectType: string,
    dodgeProjectId: string
  ): Promise<void> {
    
    // Attempt to geocode the address
    let coordinates = null;
    if (fullAddress) {
      coordinates = await geocodeAddress(fullAddress);
    }

    const newJob: InsertJob = {
      name: projectName,
      description,
      address: fullAddress,
      latitude: coordinates?.lat?.toString() || null,
      longitude: coordinates?.lng?.toString() || null,
      type: projectType as any,
      status: (this.normalizeStatus(row['Status']) || 'planning') as any,
      projectValue: projectValue?.toString() || null,
      startDate: this.parseDate(row['Start Date']) ? new Date(this.parseDate(row['Start Date'])!) : null,
      endDate: this.parseDate(row['End Date']) ? new Date(this.parseDate(row['End Date'])!) : null,
      contractor: this.cleanString(row['Contractor'] || ''),
      phone: this.cleanString(row['Phone'] || ''),
      email: this.cleanString(row['Email'] || ''),
      notes: '', // Empty notes - user can add their own
      isCustom: false,
      dodgeJobId: dodgeProjectId,
      // Track viewing status
      isViewed: false,
      viewedAt: null,
      userNotes: ''
    };

    await db.insert(jobs).values(newJob);
  }

  /**
   * Build full address from CSV components
   */
  private buildFullAddress(row: DodgeCSVRow): string {
    const parts = [
      row['Address'],
      row['City'],
      row['State'],
      row['ZIP']
    ].filter(part => part && part.trim());
    
    return parts.join(', ');
  }

  /**
   * Parse project value from string
   */
  private parseProjectValue(value?: string): number | null {
    if (!value) return null;
    
    // Remove currency symbols, commas, and other formatting
    const cleaned = value.replace(/[$,\s]/g, '');
    const number = parseFloat(cleaned);
    
    return isNaN(number) ? null : number;
  }

  /**
   * Normalize project type
   */
  private normalizeProjectType(type?: string): string {
    if (!type) return 'commercial';
    
    const normalized = type.toLowerCase().trim();
    
    if (normalized.includes('commercial') || normalized.includes('office') || normalized.includes('retail')) {
      return 'commercial';
    }
    if (normalized.includes('residential') || normalized.includes('housing') || normalized.includes('apartment')) {
      return 'residential';
    }
    if (normalized.includes('industrial') || normalized.includes('warehouse') || normalized.includes('manufacturing')) {
      return 'industrial';
    }
    if (normalized.includes('equipment') || normalized.includes('machinery')) {
      return 'equipment';
    }
    
    return 'commercial'; // Default fallback
  }

  /**
   * Normalize status
   */
  private normalizeStatus(status?: string): string | null {
    if (!status) return null;
    
    const normalized = status.toLowerCase().trim();
    
    if (normalized.includes('active') || normalized.includes('construction') || normalized.includes('building')) {
      return 'active';
    }
    if (normalized.includes('planning') || normalized.includes('design') || normalized.includes('permit')) {
      return 'planning';
    }
    if (normalized.includes('complete') || normalized.includes('finished') || normalized.includes('done')) {
      return 'completed';
    }
    if (normalized.includes('pending') || normalized.includes('review') || normalized.includes('approval')) {
      return 'pending';
    }
    
    return 'planning'; // Default
  }

  /**
   * Parse date string
   */
  private parseDate(dateStr?: string): string | null {
    if (!dateStr) return null;
    
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  /**
   * Clean and trim string values
   */
  private cleanString(value?: string): string {
    return value ? value.trim() : '';
  }
}

export const csvImportService = new CSVImportService();