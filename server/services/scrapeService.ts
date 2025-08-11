import * as cheerio from 'cheerio';
import { storage } from '../storage';
import { type InsertJob } from '@shared/schema';
import { geocodeAddress } from './geocodingService';

interface DodgeJobData {
  id: string;
  name: string;
  address: string;
  contractor?: string;
  projectValue?: string;
  startDate?: string;
  endDate?: string;
  type: 'commercial' | 'residential' | 'industrial';
  specialConditions?: string;
}

export class ScrapeService {
  private apiKey: string;
  private baseUrl = 'https://www.construction.com'; // Dodge Data & Analytics URL
  
  constructor() {
    this.apiKey = process.env.DODGE_API_KEY || process.env.API_KEY || 'your-dodge-api-key';
  }

  async scrapeDailyJobs(): Promise<void> {
    try {
      console.log('Starting daily job scraping...');
      
      // In a real implementation, you would make authenticated requests to Dodge Data & Analytics API
      // For now, we'll simulate the process but expect the API key to be valid when provided
      
      const jobs = await this.fetchJobsFromDodge();
      
      for (const jobData of jobs) {
        await this.processJobData(jobData);
      }
      
      console.log(`Processed ${jobs.length} jobs from Dodge Data & Analytics`);
    } catch (error) {
      console.error('Error scraping daily jobs:', error);
      throw error;
    }
  }

  private async fetchJobsFromDodge(): Promise<DodgeJobData[]> {
    // This would make actual API calls to Dodge Data & Analytics
    // Using the provided API key in environment variables
    // Focused on California construction projects
    
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Construction-Sales-Tracker/1.0'
    };

    try {
      // Example API endpoint structure targeting California projects
      const response = await fetch(`${this.baseUrl}/api/v1/projects?state=CA&status=active,planning`, {
        headers,
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`Dodge API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseDodgeResponse(data);
      
    } catch (error) {
      console.error('Error fetching from Dodge API:', error);
      // Return empty array if API fails to prevent application crash
      return [];
    }
  }

  private parseDodgeResponse(data: any): DodgeJobData[] {
    // Parse the response from Dodge Data & Analytics API
    // This would depend on their actual API response format
    
    if (!data || !Array.isArray(data.projects)) {
      console.warn('Invalid response format from Dodge API');
      return [];
    }

    return data.projects.map((project: any) => ({
      id: project.id || project.projectId,
      name: project.name || project.title,
      address: this.cleanAddress(project.address || project.location),
      contractor: project.generalContractor || project.contractor,
      projectValue: project.value || project.estimatedValue,
      startDate: project.startDate,
      endDate: project.completionDate || project.endDate,
      type: this.determineProjectType(project.type || project.category),
      specialConditions: project.notes || project.conditions
    }));
  }

  private cleanAddress(address: string): string {
    if (!address) return '';
    
    // Clean up address formatting
    return address
      .replace(/\s+/g, ' ')
      .replace(/,\s*,/g, ',')
      .replace(/^\s*,\s*|\s*,\s*$/g, '')
      .trim();
  }

  private determineProjectType(type: string): 'commercial' | 'residential' | 'industrial' {
    const typeStr = type?.toLowerCase() || '';
    
    if (typeStr.includes('residential') || typeStr.includes('housing') || typeStr.includes('apartment')) {
      return 'residential';
    }
    
    if (typeStr.includes('industrial') || typeStr.includes('manufacturing') || typeStr.includes('warehouse')) {
      return 'industrial';
    }
    
    return 'commercial';
  }

  private async processJobData(jobData: DodgeJobData): Promise<void> {
    try {
      // Check if job already exists
      const existingJob = await storage.getJobByDodgeId(jobData.id);
      if (existingJob) {
        // Update existing job
        await storage.updateJob(existingJob.id, {
          name: jobData.name,
          address: jobData.address,
          contractor: jobData.contractor,
          projectValue: jobData.projectValue,
          startDate: jobData.startDate ? new Date(jobData.startDate) : undefined,
          endDate: jobData.endDate ? new Date(jobData.endDate) : undefined,
          type: jobData.type,
          specialConditions: jobData.specialConditions,
        });
        return;
      }

      // Geocode the address
      const coordinates = await geocodeAddress(jobData.address);
      
      // Create new job
      const newJob: InsertJob = {
        name: jobData.name,
        address: jobData.address,
        latitude: coordinates?.lat.toString(),
        longitude: coordinates?.lng.toString(),
        contractor: jobData.contractor,
        projectValue: jobData.projectValue,
        status: 'active',
        type: jobData.type,
        startDate: jobData.startDate ? new Date(jobData.startDate) : undefined,
        endDate: jobData.endDate ? new Date(jobData.endDate) : undefined,
        specialConditions: jobData.specialConditions,
        isCustom: false,
        dodgeJobId: jobData.id,
      };

      await storage.createJob(newJob);
    } catch (error) {
      console.error(`Error processing job data for ${jobData.name}:`, error);
    }
  }

  async searchJobsByLocation(location: string, radius: number = 50): Promise<DodgeJobData[]> {
    // Search for jobs in specific location with radius in miles
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/projects/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          location,
          radius,
          status: ['active', 'planning']
        })
      });

      if (!response.ok) {
        throw new Error(`Search request failed: ${response.status}`);
      }

      const data = await response.json();
      return this.parseDodgeResponse(data);
    } catch (error) {
      console.error('Error searching jobs by location:', error);
      return [];
    }
  }
}

export const scrapeService = new ScrapeService();
