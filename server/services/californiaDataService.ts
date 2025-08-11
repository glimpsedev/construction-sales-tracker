import { db } from "../db";
import { jobs } from "@shared/schema";
import { geocodeAddress } from "./geocodingService";

interface BuildingPermit {
  id: string;
  applicationNumber?: string;
  address: string;
  projectDescription: string;
  contractorName?: string;
  estimatedCost?: number;
  permitType?: string;
  status: string;
  issueDate?: string;
  expirationDate?: string;
  latitude?: number;
  longitude?: number;
}

export class CaliforniaDataService {
  
  /**
   * Fetch building permits from San Francisco Open Data API
   */
  async fetchSanFranciscoPermits(): Promise<BuildingPermit[]> {
    try {
      // San Francisco Building Permits API
      const response = await fetch(
        'https://data.sfgov.org/resource/i98e-djp9.json?$limit=1000&permit_type=1&$order=filed_date DESC',
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`SF API Error: ${response.status}`);
      }

      const permits = await response.json();
      
      return permits.map((permit: any) => ({
        id: `sf-${permit.permit_number}`,
        applicationNumber: permit.permit_number,
        address: `${permit.street_number || ''} ${permit.street_name || ''}, San Francisco, CA ${permit.zipcode || ''}`.trim(),
        projectDescription: permit.description || 'Building permit project',
        contractorName: permit.contractor_name || 'Unknown Contractor',
        estimatedCost: permit.estimated_cost ? parseFloat(permit.estimated_cost) : 0,
        permitType: permit.permit_type_definition || 'Building',
        status: this.normalizeStatus(permit.status),
        issueDate: permit.issued_date,
        expirationDate: permit.expiration_date,
        latitude: permit.location?.latitude ? parseFloat(permit.location.latitude) : undefined,
        longitude: permit.location?.longitude ? parseFloat(permit.location.longitude) : undefined,
      }));
    } catch (error) {
      console.error('Error fetching SF permits:', error);
      return [];
    }
  }

  /**
   * Fetch building permits from Los Angeles Open Data API
   */
  async fetchLosAngelesPermits(): Promise<BuildingPermit[]> {
    try {
      // Los Angeles Building Permits API
      const response = await fetch(
        'https://data.lacity.org/resource/nbyu-2ha9.json?$limit=1000&$order=issue_date DESC',
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`LA API Error: ${response.status}`);
      }

      const permits = await response.json();
      
      return permits.map((permit: any) => ({
        id: `la-${permit.permit_nbr}`,
        applicationNumber: permit.permit_nbr,
        address: `${permit.address || ''}, Los Angeles, CA ${permit.zip_code || ''}`.trim(),
        projectDescription: permit.permit_type || 'Building permit project',
        contractorName: permit.contractor_business_name || 'Unknown Contractor',
        estimatedCost: permit.valuation ? parseFloat(permit.valuation) : 0,
        permitType: permit.permit_sub_type || 'Building',
        status: this.normalizeStatus(permit.status),
        issueDate: permit.issue_date,
        expirationDate: permit.expiration_date,
        latitude: permit.location_1?.latitude ? parseFloat(permit.location_1.latitude) : undefined,
        longitude: permit.location_1?.longitude ? parseFloat(permit.location_1.longitude) : undefined,
      }));
    } catch (error) {
      console.error('Error fetching LA permits:', error);
      return [];
    }
  }

  /**
   * Fetch building permits from San Jose Open Data API
   */
  async fetchSanJosePermits(): Promise<BuildingPermit[]> {
    try {
      // San Jose Active Building Permits API
      const response = await fetch(
        'https://data.sanjoseca.gov/resource/4t29-25we.json?$limit=1000&$order=date_applied DESC',
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`San Jose API Error: ${response.status}`);
      }

      const permits = await response.json();
      
      return permits.map((permit: any) => ({
        id: `sj-${permit.permit_number}`,
        applicationNumber: permit.permit_number,
        address: `${permit.address || ''}, San Jose, CA`.trim(),
        projectDescription: permit.description || permit.permit_type || 'Building permit project',
        contractorName: permit.contractor || 'Unknown Contractor',
        estimatedCost: permit.valuation ? parseFloat(permit.valuation) : 0,
        permitType: permit.permit_type || 'Building',
        status: this.normalizeStatus(permit.permit_status),
        issueDate: permit.date_applied,
        expirationDate: permit.expiration_date,
        latitude: permit.latitude ? parseFloat(permit.latitude) : undefined,
        longitude: permit.longitude ? parseFloat(permit.longitude) : undefined,
      }));
    } catch (error) {
      console.error('Error fetching San Jose permits:', error);
      return [];
    }
  }

  /**
   * Fetch California state contract data
   */
  async fetchStateContracts(): Promise<BuildingPermit[]> {
    try {
      // California state procurement data would require authentication
      // For now, we'll return empty array until we can set up proper access
      console.log('State contract data requires authentication - skipping for now');
      return [];
    } catch (error) {
      console.error('Error fetching state contracts:', error);
      return [];
    }
  }

  /**
   * Normalize status values from different APIs
   */
  private normalizeStatus(status: string): 'active' | 'completed' | 'planning' | 'pending' {
    if (!status) return 'pending';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('issued') || statusLower.includes('active') || statusLower.includes('approved')) {
      return 'active';
    }
    if (statusLower.includes('complete') || statusLower.includes('finaled') || statusLower.includes('closed')) {
      return 'completed';
    }
    if (statusLower.includes('plan') || statusLower.includes('review') || statusLower.includes('applied')) {
      return 'planning';
    }
    
    return 'pending';
  }

  /**
   * Convert building permits to job format and store in database
   */
  async processPermitsToJobs(permits: BuildingPermit[]): Promise<void> {
    for (const permit of permits) {
      try {
        // Skip if we already have this permit
        const existingJob = await db.query.jobs.findFirst({
          where: (jobs, { eq }) => eq(jobs.dodgeJobId, permit.id)
        });
        
        if (existingJob) continue;

        let latitude = permit.latitude?.toString();
        let longitude = permit.longitude?.toString();

        // Geocode if coordinates not provided
        if (!latitude || !longitude) {
          const coordinates = await geocodeAddress(permit.address);
          if (coordinates) {
            latitude = coordinates.lat.toString();
            longitude = coordinates.lng.toString();
          }
        }

        // Insert job into database
        await db.insert(jobs).values({
          name: permit.projectDescription,
          address: permit.address,
          latitude,
          longitude,
          contractor: permit.contractorName,
          projectValue: permit.estimatedCost?.toString(),
          status: permit.status,
          type: 'commercial', // Default type
          startDate: permit.issueDate ? new Date(permit.issueDate) : undefined,
          endDate: permit.expirationDate ? new Date(permit.expirationDate) : undefined,
          dodgeJobId: permit.id,
          notes: `Building permit: ${permit.permitType}`,
          isCustom: false
        }).onConflictDoNothing();

      } catch (error) {
        console.error(`Error processing permit ${permit.id}:`, error);
      }
    }
  }

  /**
   * Fetch all California construction data from multiple sources
   */
  async fetchAllCaliforniaData(): Promise<void> {
    console.log('Fetching California construction data from multiple sources...');
    
    try {
      const [sfPermits, laPermits, sjPermits] = await Promise.all([
        this.fetchSanFranciscoPermits(),
        this.fetchLosAngelesPermits(),
        this.fetchSanJosePermits()
      ]);

      const allPermits = [...sfPermits, ...laPermits, ...sjPermits];
      console.log(`Fetched ${allPermits.length} total permits from CA open data sources`);

      // Filter for significant projects (over $50k)
      const significantPermits = allPermits.filter(permit => 
        (permit.estimatedCost || 0) > 50000
      );

      console.log(`Processing ${significantPermits.length} significant construction projects`);
      await this.processPermitsToJobs(significantPermits);
      
    } catch (error) {
      console.error('Error fetching California data:', error);
      throw error;
    }
  }
}

export const californiaDataService = new CaliforniaDataService();