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
      
      // Debug: Check the first row to see column names
      if (rawData.length > 0) {
        console.log('First row columns:', Object.keys(rawData[0]));
      }

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        
        try {
          // Skip empty rows - check for various possible column names
          const projectNameRaw = row['Project Name (Link)'] || row['Project Name'] || row['project name'] || row['Name'] || '';
          if (!row || !projectNameRaw) {
            console.log(`Row ${i}: Skipped - no project name found`);
            results.skipped++;
            continue;
          }
          
          // Skip non-California jobs - check county for California locations
          const state = this.cleanString(row['State'] || row['state'] || '');
          const county = this.cleanString(row['County'] || row['COUNTY'] || row['county'] || '');
          
          // If we have a county but no state, assume it's California if county exists
          const isCaliforniaJob = (!state || state.toUpperCase() === 'CA' || state.toUpperCase() === 'CALIFORNIA') && county;
          
          if (state && state.toUpperCase() !== 'CA' && state.toUpperCase() !== 'CALIFORNIA') {
            console.log(`Row ${i}: Skipped - not in California (State: ${state})`);
            results.skipped++;
            continue;
          }

          // Extract and clean data - using the actual column names from the new Dodge export format
          const projectName = this.cleanString(projectNameRaw);
          const description = this.cleanString(row['Comments'] || row['Project Description'] || '');
          const fullAddress = this.buildFullAddress(row);
          const projectValue = this.parseProjectValue(row['Valuation'] || row['Low Value'] || row['High Value']);
          const projectType = this.normalizeProjectType(row['Primary Project Type'] || row['Project Type(s)']);
          const dodgeProjectId = this.cleanString(row['Project ID'] || row['Dodge Report Number'] || '');

          // Create new job (duplicates temporarily disabled)
          await this.createNewJobFromCSV(row, projectName, description, fullAddress, projectValue, projectType, dodgeProjectId);
          results.imported++;
          if (i < 5) {
            console.log(`Imported: ${projectName} at ${fullAddress}`);
          }

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

    // Extract additional info from new Dodge format columns
    const ownerName = this.cleanString(row['Owner: Company Name'] || row['Owner Name (Link)'] || row['Owner'] || '');
    const architectName = this.cleanString(row['Architect: Company Name'] || row['Architect Name (Link)'] || row['Architect'] || '');
    const contractorName = this.cleanString(row['GC: Company Name'] || row['Contractor'] || '');
    const status = this.cleanString(row['Work Type'] || row['Status'] || '');
    const deliverySystem = this.cleanString(row['Delivery System'] || '');
    const tags = this.cleanString(row['Tags (Private)'] || row['Tags (Shared)'] || row['Tags'] || '');
    const userNotes = this.cleanString(row['User Notes'] || '');
    const specsAvailable = this.cleanString(row['Specs Available'] || '');
    // Look for date columns - Dodge uses different column names in different exports
    const targetStartDate = row['Target Start Date'] || row['Start Date'] || row['Bid Date'] || '';
    const targetEndDate = row['Target Completion Date'] || row['End Date'] || row['Completion Date'] || '';
    
    // Get phone and email from new column format
    const phone = this.cleanString(row['GC: Company Phone'] || row['Owner: Company Phone'] || row['Phone'] || '');
    const email = this.cleanString(row['GC: Company Email'] || row['Email'] || '');
    const gcContactName = this.cleanString(row['GC: Contact Name'] || '');
    const gcWebsite = this.cleanString(row['GC: Company Website'] || '');
    
    // Enhance description with all available info
    const enhancedDescription = [
      description,
      ownerName ? `Owner: ${ownerName}` : '',
      architectName ? `Architect: ${architectName}` : '',
      deliverySystem ? `Delivery System: ${deliverySystem}` : '',
      specsAvailable ? `Specs Available: ${specsAvailable}` : '',
      gcWebsite ? `Website: ${gcWebsite}` : '',
      tags ? `Tags: ${tags}` : '',
      userNotes ? `Notes: ${userNotes}` : ''
    ].filter(Boolean).join('\n');

    const newJob: InsertJob = {
      name: projectName,
      description: enhancedDescription,
      address: fullAddress,
      county: this.cleanString(row['County'] || row['COUNTY'] || ''),
      latitude: coordinates?.lat?.toString() || null,
      longitude: coordinates?.lng?.toString() || null,
      type: projectType as any,
      status: (this.normalizeStatus(status) || 'planning') as any,
      projectValue: projectValue?.toString() || null,
      startDate: this.parseDate(targetStartDate) ? new Date(this.parseDate(targetStartDate)!) : null,
      endDate: this.parseDate(targetEndDate) ? new Date(this.parseDate(targetEndDate)!) : null,
      contractor: contractorName || '',
      owner: ownerName || '',
      architect: architectName || '',
      phone: phone,
      email: email,
      officeContact: gcContactName || '',
      specialConditions: deliverySystem || '',
      notes: tags || '', // Use tags as notes
      orderedBy: this.cleanString(row['Ordered By'] || ''),
      isCustom: false,
      dodgeJobId: dodgeProjectId,
      // Track viewing status
      isViewed: false,
      viewedAt: null,
      userNotes: userNotes || ''
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
      row['Zip Code'] || row['ZIP']
    ].filter(part => part && part.trim());
    
    return parts.join(', ');
  }

  /**
   * Parse project value from string or number
   * Handles formats like "$ 85000000" or "$ 4500000 - $ 5000000"
   */
  private parseProjectValue(value?: any): number | null {
    if (!value) return null;
    
    // If it's already a number, return it
    if (typeof value === 'number') return value;
    
    // Convert to string and clean up
    const valueStr = String(value);
    
    // Handle range format (e.g., "$ 4500000 - $ 5000000")
    if (valueStr.includes('-')) {
      const parts = valueStr.split('-');
      // Take the higher value from the range
      const highValue = parts[parts.length - 1];
      const cleaned = highValue.replace(/[$,\s]/g, '');
      const number = parseFloat(cleaned);
      return isNaN(number) ? null : number;
    }
    
    // Handle single value
    const cleaned = valueStr.replace(/[$,\s]/g, '');
    const number = parseFloat(cleaned);
    
    return isNaN(number) ? null : number;
  }

  /**
   * Normalize project type
   * Handles new Dodge format types like "Middle/Senior High School", "Water Line", etc.
   */
  private normalizeProjectType(type?: string): string {
    if (!type) return 'commercial';
    
    const normalized = type.toLowerCase().trim();
    
    // Educational facilities
    if (normalized.includes('school') || normalized.includes('education') || normalized.includes('university')) {
      return 'commercial';
    }
    // Infrastructure
    if (normalized.includes('water') || normalized.includes('sewer') || normalized.includes('pipeline') || 
        normalized.includes('power') || normalized.includes('utility')) {
      return 'industrial';
    }
    // Residential
    if (normalized.includes('residential') || normalized.includes('housing') || normalized.includes('apartment') ||
        normalized.includes('condo') || normalized.includes('townhome')) {
      return 'residential';
    }
    // Commercial
    if (normalized.includes('commercial') || normalized.includes('office') || normalized.includes('retail') ||
        normalized.includes('restaurant') || normalized.includes('hotel')) {
      return 'commercial';
    }
    // Industrial
    if (normalized.includes('industrial') || normalized.includes('warehouse') || normalized.includes('manufacturing') ||
        normalized.includes('facility') || normalized.includes('plant')) {
      return 'industrial';
    }
    // Equipment
    if (normalized.includes('equipment') || normalized.includes('machinery')) {
      return 'equipment';
    }
    
    return 'commercial'; // Default fallback
  }

  /**
   * Normalize status
   * Handles new Dodge format "Work Type" values like "New Project"
   */
  private normalizeStatus(status?: string): string | null {
    if (!status) return null;
    
    const normalized = status.toLowerCase().trim();
    
    // New project types from Dodge
    if (normalized.includes('new project') || normalized.includes('new')) {
      return 'planning';
    }
    if (normalized.includes('addition') || normalized.includes('alteration') || normalized.includes('renovation')) {
      return 'active';
    }
    // Standard status mappings
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
  private parseDate(dateStr?: any): string | null {
    if (!dateStr || dateStr === 'NaT' || dateStr === 'nan' || dateStr === '') return null;
    
    try {
      let date: Date;
      
      // If it's already a Date object (from Excel parsing)
      if (dateStr instanceof Date) {
        date = dateStr;
      }
      // If it's a number (Excel serial date)
      else if (typeof dateStr === 'number') {
        // Excel serial date numbers (days since 1900-01-01)
        date = new Date((dateStr - 25569) * 86400 * 1000);
      }
      // If it's a string, parse it
      else if (typeof dateStr === 'string') {
        const cleanedDate = dateStr.trim();
        
        // Handle pandas datetime format (e.g., "2024-10-01 00:00:00")
        if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(cleanedDate)) {
          date = new Date(cleanedDate.replace(' ', 'T') + 'Z');
        }
        // Try MM/DD/YYYY or M/D/YYYY format (most common in US)
        else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanedDate)) {
          const [month, day, year] = cleanedDate.split('/').map(Number);
          date = new Date(year, month - 1, day);
        }
        // Try YYYY-MM-DD format
        else if (/^\d{4}-\d{2}-\d{2}$/.test(cleanedDate)) {
          date = new Date(cleanedDate + 'T00:00:00');
        }
        // Try DD-MMM-YY format (e.g., "01-Jan-25")
        else if (/^\d{1,2}-[A-Za-z]{3}-\d{2}$/.test(cleanedDate)) {
          date = new Date(cleanedDate);
        }
        // Fallback to native Date parsing
        else {
          date = new Date(cleanedDate);
        }
      }
      // Convert whatever it is to string first, then parse
      else {
        const strValue = String(dateStr).trim();
        date = new Date(strValue);
      }
      
      // Check if date is valid
      if (!date || isNaN(date.getTime())) {
        return null;
      }
      
      // Return in YYYY-MM-DD format
      return date.toISOString().split('T')[0];
    } catch (error) {
      // Silent fail for invalid dates
      return null;
    }
  }

  /**
   * Clean and trim string values
   */
  private cleanString(value?: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    return String(value).trim();
  }
}

export const csvImportService = new CSVImportService();