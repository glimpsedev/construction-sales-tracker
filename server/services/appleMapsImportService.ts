import { db } from "../db";
import { jobs, type Job, type InsertJob } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { geocodeAddress } from "./geocodingService";

interface OfficeLocation {
  name: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  details?: {
    inserted?: Job[];
    skipped_duplicates?: Job[];
  };
}

export class AppleMapsImportService {
  
  /**
   * Parse Apple Maps guide URL and extract office locations
   * The URL contains protobuf-encoded data with company names and addresses
   */
  parseAppleMapsGuide(url: string): OfficeLocation[] {
    try {
      // Decode the URL multiple times as it may be double-encoded
      let decoded = url;
      try {
        decoded = decodeURIComponent(url);
        // Try decoding again in case it's double-encoded
        if (decoded !== url) {
          decoded = decodeURIComponent(decoded);
        }
      } catch {
        // If decoding fails, use original
        decoded = url;
      }
      
      const locations: OfficeLocation[] = [];
      
      // Pattern to match full addresses: number + street + city + state + zip
      // Example: "41152 Stealth St, Livermore, CA  94551, United States"
      const addressPattern = /(\d{1,6}[\s\u00A0]+[^,]+?),\s*([A-Za-z\s]+?),\s*CA[\s\u00A0]+(\d{5})/g;
      
      // Pattern to match company names (ALL CAPS, may contain &, ., spaces)
      // They typically appear before addresses
      const companyNamePattern = /([A-Z][A-Z\s&.()]+?)(?=\d{1,6}[\s\u00A0]+[^,]+?,\s*[A-Za-z\s]+?,\s*CA[\s\u00A0]+\d{5})/g;
      
      const addressMatches = Array.from(decoded.matchAll(addressPattern));
      const companyMatches = Array.from(decoded.matchAll(companyNamePattern));
      
      // Create a map of address positions to find nearest company name
      const addressPositions = addressMatches.map((match, idx) => ({
        index: idx,
        match: match,
        position: match.index || 0,
        fullAddress: match[0],
        streetAddress: match[1],
        city: match[2]?.trim(),
        zip: match[3]
      }));
      
      // Match each address with the nearest preceding company name
      for (const addrInfo of addressPositions) {
        let companyName = 'Office';
        
        // Find the company name that appears before this address
        for (let i = companyMatches.length - 1; i >= 0; i--) {
          const companyMatch = companyMatches[i];
          if (!companyMatch || companyMatch.index === undefined) continue;
          
          const companyPos = companyMatch.index;
          const addrPos = addrInfo.position;
          
          // Company should be before address and reasonably close (within 1000 chars)
          if (companyPos < addrPos && (addrPos - companyPos) < 1000) {
            const name = companyMatch[1]?.trim();
            // Filter out common false positives
            if (name && 
                name.length > 2 && 
                name.length < 100 &&
                !name.match(/^(United States|California|CA)$/i)) {
              companyName = name;
              break;
            }
          }
        }
        
        // Clean up company name (remove extra spaces, normalize)
        companyName = companyName
          .replace(/\s+/g, ' ')
          .replace(/^\s+|\s+$/g, '')
          .trim();
        
        if (!companyName || companyName === 'Office') {
          // Try to extract from the address context
          // Sometimes the company name is embedded differently
          const beforeAddress = decoded.substring(Math.max(0, addrInfo.position - 200), addrInfo.position);
          const nameMatch = beforeAddress.match(/([A-Z][A-Z\s&.()]{3,50})(?=\s*\d{1,6})/);
          if (nameMatch && nameMatch[1]) {
            companyName = nameMatch[1].trim();
          }
        }
        
        const fullAddress = `${addrInfo.streetAddress}, ${addrInfo.city}, CA ${addrInfo.zip}`;
        
        locations.push({
          name: companyName || 'Office',
          address: fullAddress,
          city: addrInfo.city,
          state: 'CA',
          zip: addrInfo.zip
        });
      }
      
      // Remove duplicates based on address
      const seen = new Set<string>();
      const uniqueLocations = locations.filter(loc => {
        const key = loc.address.toLowerCase().trim();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      
      console.log(`Parsed ${uniqueLocations.length} unique office locations from Apple Maps guide`);
      
      return uniqueLocations;
    } catch (error) {
      console.error('Error parsing Apple Maps guide:', error);
      throw new Error(`Failed to parse Apple Maps guide: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Generate dedupe key for an office
   */
  private generateDedupeKey(name: string, address: string): string {
    return [
      name.toLowerCase().trim(),
      address.toLowerCase().trim()
    ].join('|');
  }
  
  /**
   * Find existing job by dedupe key
   */
  private async findJobByDedupeKey(dedupeKey: string, userId?: string): Promise<Job | null> {
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.dedupeKey, dedupeKey),
        eq(jobs.type, 'office'),
        userId ? eq(jobs.userId, userId) : sql`true`
      ))
      .limit(1);
    
    return job || null;
  }
  
  /**
   * Import offices from Apple Maps guide URL
   */
  async importAppleMapsGuide(
    url: string,
    userId?: string,
    dryRun: boolean = false
  ): Promise<ImportResult> {
    try {
      const results: ImportResult = {
        imported: 0,
        skipped: 0,
        errors: [],
        details: {
          inserted: [],
          skipped_duplicates: []
        }
      };
      
      // Parse the URL to extract locations
      const locations = this.parseAppleMapsGuide(url);
      
      console.log(`Parsed ${locations.length} office locations from Apple Maps guide (dry-run: ${dryRun})`);
      
      if (locations.length === 0) {
        results.errors.push('No locations found in Apple Maps guide URL');
        return results;
      }
      
      for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        
        try {
          if (!location.name || !location.address) {
            results.skipped++;
            continue;
          }
          
          // Generate dedupe key
          const dedupeKey = this.generateDedupeKey(location.name, location.address);
          
          // Check if office already exists
          const existingJob = await this.findJobByDedupeKey(dedupeKey, userId);
          
          if (existingJob) {
            results.skipped++;
            results.details?.skipped_duplicates?.push(existingJob);
            continue;
          }
          
          // Create new office job
          if (!dryRun) {
            const newJob = await this.createOfficeFromLocation(location, dedupeKey, userId);
            results.details?.inserted?.push(newJob);
          }
          
          results.imported++;
          
          if (i < 5) {
            console.log(`${dryRun ? '[DRY-RUN] Would import' : 'Imported'}: ${location.name} at ${location.address}`);
          }
          
        } catch (error) {
          const errorMsg = `Location ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
      
      console.log(`Apple Maps import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors`);
      return results;
      
    } catch (error) {
      console.error('Error importing Apple Maps guide:', error);
      throw new Error(`Apple Maps import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Create new office job from location data
   */
  private async createOfficeFromLocation(
    location: OfficeLocation,
    dedupeKey: string,
    userId?: string
  ): Promise<Job> {
    
    // Attempt to geocode the address
    let coordinates = null;
    if (location.address) {
      coordinates = await geocodeAddress(location.address);
    }
    
    const newJob: any = {
      name: location.name,
      address: location.address,
      city: location.city,
      county: location.city, // Use city as county fallback
      latitude: coordinates?.lat?.toString() || null,
      longitude: coordinates?.lng?.toString() || null,
      type: 'office' as any,
      status: 'active' as any,
      isCustom: false,
      dedupeKey,
      lockedFields: [],
      lastImportedAt: new Date(),
      userId: userId
    };
    
    const [created] = await db.insert(jobs).values(newJob).returning();
    return created;
  }
}

export const appleMapsImportService = new AppleMapsImportService();
