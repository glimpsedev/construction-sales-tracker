import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertJobSchema, insertEquipmentSchema, insertDocumentSchema, insertCompanySchema, insertContactSchema, insertContactJobSchema, insertInteractionSchema, jobs, type Job, DEFAULT_FILTER_PREFERENCES, type FilterPreferences } from "@shared/schema";
import { eq, desc, and, or, gte, lte, sql, count, asc, isNotNull } from "drizzle-orm";
import { rentalEquipment } from "@shared/schema";
import { db } from "./db";
import { authenticate, AuthRequest, hashPassword, verifyPassword, generateToken, createInitialUser } from "./auth";
import authRoutes from "./authRoutes";

import { documentProcessor } from "./services/documentProcessor";
import { emailProcessor } from "./services/emailProcessor";
import { emailWebhookService } from "./services/emailWebhookService";
import { csvImportService } from "./services/csvImportService";
import { importKycCsv } from "./services/kycImportService";
import { generateDownDayPdf } from "./services/downDayPdfService";
import { emailService } from "./services/emailService";
import { geocodeAddress } from "./services/geocodingService";
import multer from 'multer';


// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Word documents and text files are allowed.'));
    }
  }
});

// Configure multer for Excel files (equipment status emails)
const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExtension = allowedExtensions.some(ext => 
      file.originalname.toLowerCase().endsWith(ext)
    );
    
    if (allowedTypes.includes(file.mimetype) || hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
    }
  }
});

// Configure multer for VCF contact import
const uploadVcf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['text/vcard', 'text/x-vcard'];
    const hasVcfExt = file.originalname.toLowerCase().endsWith('.vcf');
    if (allowed.includes(file.mimetype) || hasVcfExt) cb(null, true);
    else cb(new Error('Invalid file type. Only VCF files are allowed.'));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for deployment
  app.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Create initial user on startup
  await createInitialUser();
  
  // Use auth routes for registration, verification, etc
  app.use("/api/auth", authRoutes);
  
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = generateToken(user.id);
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email 
        } 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });
  
  app.get("/api/auth/me", authenticate, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ 
        id: user.id, 
        email: user.email 
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });
  
  // Migrate existing jobs to the initial user
  app.post("/api/auth/migrate", async (req, res) => {
    try {
      const user = await storage.getUserByEmail('hgrady@jscole.com');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Update all jobs without a userId to belong to this user
      const result = await db.update(jobs)
        .set({ userId: user.id })
        .where(sql`${jobs.userId} IS NULL`);
        
      res.json({ message: 'Migration completed', jobsUpdated: result.rowCount });
    } catch (error) {
      console.error('Migration error:', error);
      res.status(500).json({ error: 'Migration failed' });
    }
  });

  // Filter preferences routes
  app.get("/api/user/filter-preferences", authenticate, async (req: AuthRequest, res) => {
    try {
      const userPreferences = await storage.getFilterPreferences(req.userId!);
      
      // Merge user preferences with defaults
      const mergedPreferences: FilterPreferences = {
        ...DEFAULT_FILTER_PREFERENCES,
        ...(userPreferences || {})
      };
      
      res.json(mergedPreferences);
    } catch (error) {
      console.error('Get filter preferences error:', error);
      res.status(500).json({ error: 'Failed to get filter preferences' });
    }
  });

  app.put("/api/user/filter-preferences", authenticate, async (req: AuthRequest, res) => {
    try {
      const preferences = req.body as FilterPreferences;
      
      // Validate preferences structure
      if (!preferences || typeof preferences !== 'object') {
        return res.status(400).json({ error: 'Invalid preferences format' });
      }
      
      // Validate each filter preference
      for (const [key, value] of Object.entries(preferences)) {
        if (!value || typeof value !== 'object') {
          return res.status(400).json({ error: `Invalid preference for ${key}` });
        }
        if (typeof value.name !== 'string' || typeof value.icon !== 'string' || typeof value.color !== 'string') {
          return res.status(400).json({ error: `Invalid preference structure for ${key}` });
        }
        // Validate color format (hex)
        if (!/^#[0-9A-Fa-f]{6}$/.test(value.color)) {
          return res.status(400).json({ error: `Invalid color format for ${key}. Must be hex color (e.g., #ef4444)` });
        }
      }
      
      await storage.updateFilterPreferences(req.userId!, preferences);
      res.json({ success: true });
    } catch (error) {
      console.error('Update filter preferences error:', error);
      res.status(500).json({ error: 'Failed to update filter preferences' });
    }
  });
  
  // Job routes (protected)
  app.get("/api/jobs", authenticate, async (req: AuthRequest, res) => {
    try {
      const {
        search,
        status,
        type,
        temperature,
        startDate,
        endDate,
        minValue,
        maxValue,
        cold,
        county,
        company,
        nearLat,
        nearLng,
        unvisited,
        offices
      } = req.query;

      const filters = {
        search: search as string | undefined,
        status: status ? (status as string).split(',') : undefined,
        type: type ? (type as string).split(',') : undefined,
        temperature: temperature ? (temperature as string).split(',') : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        minValue: minValue ? parseFloat(minValue as string) : undefined,
        maxValue: maxValue ? parseFloat(maxValue as string) : undefined,
        cold: cold === 'false' ? false : cold === 'true' ? true : undefined,
        county: county as string | undefined,
        company: company as string | undefined,
        nearLat: nearLat ? parseFloat(nearLat as string) : undefined,
        nearLng: nearLng ? parseFloat(nearLng as string) : undefined,
        unvisited: unvisited === 'true' ? true : undefined,
        offices: offices === 'false' ? false : offices === 'true' ? true : undefined,
        userId: req.userId,
      };

      const jobs = await storage.searchJobs(filters);
      res.json(jobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  });

  app.get("/api/jobs/:id", authenticate, async (req: AuthRequest, res) => {
    try {
      const job = await storage.getJobById(req.params.id, req.userId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      // Get equipment for this job
      const equipment = await storage.getEquipmentByJobId(job.id, req.userId);
      res.json({ ...job, equipment });
    } catch (error) {
      console.error('Error fetching job:', error);
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  });

  app.post("/api/jobs", authenticate, async (req: AuthRequest, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      jobData.userId = req.userId;
      
      // Geocode address if provided
      if (jobData.address && !jobData.latitude && !jobData.longitude) {
        const coordinates = await geocodeAddress(jobData.address);
        if (coordinates) {
          jobData.latitude = coordinates.lat.toString();
          jobData.longitude = coordinates.lng.toString();
        }
      }
      
      const job = await storage.createJob({ ...jobData, isCustom: true });
      res.status(201).json(job);
    } catch (error) {
      console.error('Error creating job:', error);
      if (error instanceof Error && error.message.includes('parse')) {
        res.status(400).json({ error: 'Invalid job data', details: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create job' });
      }
    }
  });

  app.put("/api/jobs/:id", authenticate, async (req: AuthRequest, res) => {
    try {
      const updates = insertJobSchema.partial().parse(req.body);
      
      // Re-geocode if address changed
      if (updates.address && (!updates.latitude || !updates.longitude)) {
        const coordinates = await geocodeAddress(updates.address);
        if (coordinates) {
          updates.latitude = coordinates.lat.toString();
          updates.longitude = coordinates.lng.toString();
        }
      }
      
      const job = await storage.updateJob(req.params.id, updates, req.userId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json(job);
    } catch (error) {
      console.error('Error updating job:', error);
      res.status(500).json({ error: 'Failed to update job' });
    }
  });

  app.delete("/api/jobs/:id", authenticate, async (req: AuthRequest, res) => {
    try {
      const deleted = await storage.deleteJob(req.params.id, req.userId);
      if (!deleted) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting job:', error);
      res.status(500).json({ error: 'Failed to delete job' });
    }
  });

  // Equipment routes
  app.get("/api/jobs/:jobId/equipment", authenticate, async (req: AuthRequest, res) => {
    try {
      const equipment = await storage.getEquipmentByJobId(req.params.jobId, req.userId);
      res.json(equipment);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      res.status(500).json({ error: 'Failed to fetch equipment' });
    }
  });

  app.get("/api/jobs/:jobId/contacts", authenticate, async (req: AuthRequest, res) => {
    try {
      const contacts = await storage.getJobContacts(req.params.jobId, req.userId);
      res.json(contacts);
    } catch (error) {
      console.error('Error fetching job contacts:', error);
      res.status(500).json({ error: 'Failed to fetch job contacts' });
    }
  });

  app.post("/api/equipment", authenticate, async (req: AuthRequest, res) => {
    try {
      const equipmentData = insertEquipmentSchema.parse(req.body);
      equipmentData.userId = req.userId;
      const equipment = await storage.createEquipment(equipmentData);
      res.status(201).json(equipment);
    } catch (error) {
      console.error('Error creating equipment:', error);
      res.status(500).json({ error: 'Failed to create equipment' });
    }
  });

  // Document processing routes
  app.post("/api/documents/upload", upload.array('documents', 10), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const results = [];
      for (const file of req.files) {
        try {
          const extractedData = await documentProcessor.processDocument({
            filename: `${Date.now()}-${file.originalname}`,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size.toString(),
            buffer: file.buffer
          });
          
          results.push({
            filename: file.originalname,
            success: true,
            extractedData
          });
        } catch (error) {
          results.push({
            filename: file.originalname,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      res.json({ results });
    } catch (error) {
      console.error('Error processing documents:', error);
      res.status(500).json({ error: 'Failed to process documents' });
    }
  });

  app.get("/api/documents", authenticate, async (req: AuthRequest, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });



  // Statistics route
  app.get("/api/stats", authenticate, async (req: AuthRequest, res) => {
    try {
      const allJobs = await storage.getAllJobs(req.userId);
      
      const stats = {
        totalJobs: allJobs.length,
        activeJobs: allJobs.filter(job => job.status === 'active').length,
        completedJobs: allJobs.filter(job => job.status === 'completed').length,
        pendingJobs: allJobs.filter(job => job.status === 'pending').length,
        planningJobs: allJobs.filter(job => job.status === 'planning').length,
        commercialJobs: allJobs.filter(job => job.type === 'commercial').length,
        residentialJobs: allJobs.filter(job => job.type === 'residential').length,
        industrialJobs: allJobs.filter(job => job.type === 'industrial').length,
        equipmentJobs: allJobs.filter(job => job.type === 'equipment').length,
        customJobs: allJobs.filter(job => job.isCustom).length,
        visitedJobs: allJobs.filter(job => job.visited).length,
        unvisitedJobs: allJobs.filter(job => !job.visited && job.type !== 'office').length,
        officeJobs: allJobs.filter(job => job.type === 'office').length,
        totalValue: allJobs.reduce((sum, job) => {
          const value = job.projectValue ? parseFloat(job.projectValue) : 0;
          return sum + value;
        }, 0)
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  // Detailed statistics for analytics dashboard
  app.get("/api/stats/detailed", authenticate, async (req: AuthRequest, res) => {
    try {
      const allJobs = await storage.getAllJobs(req.userId);
      const nonOfficeJobs = allJobs.filter(j => j.type !== 'office');

      // Jobs by county (top 15)
      const countyMap: Record<string, number> = {};
      nonOfficeJobs.forEach(job => {
        const county = job.county || 'Unknown';
        countyMap[county] = (countyMap[county] || 0) + 1;
      });
      const jobsByCounty = Object.entries(countyMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      // Jobs by temperature
      const tempMap: Record<string, number> = { hot: 0, warm: 0, cold: 0, green: 0, unvisited: 0 };
      nonOfficeJobs.forEach(job => {
        if (job.temperature && tempMap[job.temperature] !== undefined) {
          tempMap[job.temperature]++;
        } else if (!job.visited) {
          tempMap.unvisited++;
        }
      });
      const jobsByTemperature = Object.entries(tempMap).map(([name, count]) => ({ name, count }));

      // Jobs by status
      const statusMap: Record<string, number> = { active: 0, planning: 0, completed: 0, pending: 0 };
      nonOfficeJobs.forEach(job => {
        if (statusMap[job.status] !== undefined) statusMap[job.status]++;
      });
      const jobsByStatus = Object.entries(statusMap).map(([name, count]) => ({ name, count }));

      // Pipeline value by status
      const valueByStatus: Record<string, number> = { active: 0, planning: 0, completed: 0, pending: 0 };
      nonOfficeJobs.forEach(job => {
        const val = job.projectValue ? parseFloat(job.projectValue) : 0;
        if (!isNaN(val) && valueByStatus[job.status] !== undefined) {
          valueByStatus[job.status] += val;
        }
      });
      const pipelineByStatus = Object.entries(valueByStatus).map(([name, value]) => ({ name, value }));

      // Visit coverage
      const visited = nonOfficeJobs.filter(j => j.visited).length;
      const total = nonOfficeJobs.length;
      const visitCoverage = { visited, unvisited: total - visited, rate: total > 0 ? Math.round((visited / total) * 100) : 0 };

      // Jobs added over time (last 12 months)
      const now = new Date();
      const monthlyJobs: { month: string; count: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const count = nonOfficeJobs.filter(j => {
          const created = j.createdAt ? new Date(j.createdAt) : null;
          return created && created >= d && created < nextMonth;
        }).length;
        monthlyJobs.push({ month: label, count });
      }

      // Top contractors
      const contractorMap: Record<string, number> = {};
      nonOfficeJobs.forEach(job => {
        if (job.contractor && job.contractor.trim()) {
          const name = job.contractor.trim();
          contractorMap[name] = (contractorMap[name] || 0) + 1;
        }
      });
      const topContractors = Object.entries(contractorMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Jobs by type
      const typeMap: Record<string, number> = {};
      nonOfficeJobs.forEach(job => {
        typeMap[job.type] = (typeMap[job.type] || 0) + 1;
      });
      const jobsByType = Object.entries(typeMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Value by county (top 15)
      const countyValueMap: Record<string, number> = {};
      nonOfficeJobs.forEach(job => {
        const val = job.projectValue ? parseFloat(job.projectValue) : 0;
        if (!isNaN(val) && val > 0) {
          const county = job.county || 'Unknown';
          countyValueMap[county] = (countyValueMap[county] || 0) + val;
        }
      });
      const valueByCounty = Object.entries(countyValueMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 15);

      // Jobs by city (top 15, parsed from address)
      const cityMap: Record<string, number> = {};
      nonOfficeJobs.forEach(job => {
        if (job.address) {
          const parts = job.address.split(',').map(s => s.trim());
          const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
          if (city) cityMap[city] = (cityMap[city] || 0) + 1;
        }
      });
      const jobsByCity = Object.entries(cityMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      // Average value by type
      const typeValueMap: Record<string, { total: number; count: number }> = {};
      nonOfficeJobs.forEach(job => {
        const val = job.projectValue ? parseFloat(job.projectValue) : 0;
        if (!isNaN(val) && val > 0) {
          if (!typeValueMap[job.type]) typeValueMap[job.type] = { total: 0, count: 0 };
          typeValueMap[job.type].total += val;
          typeValueMap[job.type].count++;
        }
      });
      const avgValueByType = Object.entries(typeValueMap)
        .map(([name, { total, count }]) => ({ name, value: Math.round(total / count) }))
        .sort((a, b) => b.value - a.value);

      // Value distribution (histogram buckets)
      const buckets = [
        { label: '$0–100K', min: 0, max: 100_000, count: 0 },
        { label: '$100K–500K', min: 100_000, max: 500_000, count: 0 },
        { label: '$500K–1M', min: 500_000, max: 1_000_000, count: 0 },
        { label: '$1M–5M', min: 1_000_000, max: 5_000_000, count: 0 },
        { label: '$5M–10M', min: 5_000_000, max: 10_000_000, count: 0 },
        { label: '$10M+', min: 10_000_000, max: Infinity, count: 0 },
      ];
      nonOfficeJobs.forEach(job => {
        const val = job.projectValue ? parseFloat(job.projectValue) : 0;
        if (!isNaN(val) && val > 0) {
          const bucket = buckets.find(b => val >= b.min && val < b.max);
          if (bucket) bucket.count++;
        }
      });
      const valueDistribution = buckets.map(b => ({ name: b.label, count: b.count }));

      // Top owners
      const ownerMap: Record<string, number> = {};
      nonOfficeJobs.forEach(job => {
        if (job.owner && job.owner.trim()) {
          const name = job.owner.trim();
          ownerMap[name] = (ownerMap[name] || 0) + 1;
        }
      });
      const topOwners = Object.entries(ownerMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top architects
      const architectMap: Record<string, number> = {};
      nonOfficeJobs.forEach(job => {
        if (job.architect && job.architect.trim()) {
          const name = job.architect.trim();
          architectMap[name] = (architectMap[name] || 0) + 1;
        }
      });
      const topArchitects = Object.entries(architectMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Cumulative jobs (running total over last 12 months)
      let runningTotal = nonOfficeJobs.filter(j => {
        const created = j.createdAt ? new Date(j.createdAt) : null;
        const firstMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        return created && created < firstMonth;
      }).length;
      const cumulativeJobs = monthlyJobs.map(m => {
        runningTotal += m.count;
        return { month: m.month, total: runningTotal };
      });

      // Pipeline value by temperature
      const tempValueMap: Record<string, number> = { hot: 0, warm: 0, cold: 0, green: 0, unvisited: 0 };
      nonOfficeJobs.forEach(job => {
        const val = job.projectValue ? parseFloat(job.projectValue) : 0;
        if (!isNaN(val) && val > 0) {
          if (job.temperature && tempValueMap[job.temperature] !== undefined) {
            tempValueMap[job.temperature] += val;
          } else if (!job.visited) {
            tempValueMap.unvisited += val;
          }
        }
      });
      const valueByTemperature = Object.entries(tempValueMap)
        .map(([name, value]) => ({ name, value }))
        .filter(d => d.value > 0);

      // Jobs this month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const jobsThisMonth = nonOfficeJobs.filter(j => {
        const created = j.createdAt ? new Date(j.createdAt) : null;
        return created && created >= monthStart;
      }).length;

      // Average job value
      const totalValue = nonOfficeJobs.reduce((sum, job) => {
        const val = job.projectValue ? parseFloat(job.projectValue) : 0;
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
      const avgJobValue = nonOfficeJobs.length > 0 ? Math.round(totalValue / nonOfficeJobs.length) : 0;

      res.json({
        jobsByCounty,
        jobsByTemperature,
        jobsByStatus,
        pipelineByStatus,
        visitCoverage,
        monthlyJobs,
        topContractors,
        jobsByType,
        valueByCounty,
        jobsByCity,
        avgValueByType,
        valueDistribution,
        topOwners,
        topArchitects,
        cumulativeJobs,
        valueByTemperature,
        jobsThisMonth,
        avgJobValue,
      });
    } catch (error) {
      console.error('Error fetching detailed stats:', error);
      res.status(500).json({ error: 'Failed to fetch detailed statistics' });
    }
  });

  // Geocoding utility route
  app.post("/api/geocode", authenticate, async (req: AuthRequest, res) => {
    try {
      const { address } = req.body;
      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }
      
      const coordinates = await geocodeAddress(address);
      if (!coordinates) {
        return res.status(404).json({ error: 'Address not found' });
      }
      
      res.json(coordinates);
    } catch (error) {
      console.error('Geocoding error:', error);
      res.status(500).json({ error: 'Geocoding failed' });
    }
  });

  // Equipment rental routes
  app.get("/api/rental-equipment", async (req, res) => {
    try {
      const equipment = await emailProcessor.getCurrentRentalStatus();
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching rental equipment:", error);
      res.status(500).json({ error: "Failed to fetch rental equipment" });
    }
  });

  // Down Day Form - generate PDF and optionally email
  app.post("/api/rental-equipment/:id/down-day", authenticate, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { dates, reason, sendEmail } = req.body as { dates: string[]; reason: string; sendEmail?: boolean };

      const [equipment] = await db.select().from(rentalEquipment).where(eq(rentalEquipment.id, id));
      if (!equipment) {
        return res.status(404).json({ error: "Equipment not found" });
      }

      const customerName = equipment.customerOnRent ?? equipment.customer ?? "Unknown";
      const equipmentNumbers = equipment.equipmentNumber;

      const pdfBuffer = await generateDownDayPdf({
        customerName,
        equipmentNumbers,
        dates: Array.isArray(dates) ? dates : [],
        reason: String(reason ?? ""),
      });

      if (sendEmail) {
        await emailService.sendDownDayForm(pdfBuffer, equipmentNumbers, customerName);
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="DownDayForm-${equipmentNumbers}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating Down Day Form:", error);
      res.status(500).json({ error: "Failed to generate Down Day Form" });
    }
  });

  // Process equipment status email (Excel file)
  app.post("/api/process-equipment-email", uploadExcel.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const count = await emailProcessor.processEquipmentStatusExcel(req.file.buffer);
      res.json({ success: true, count, message: `Processed ${count} equipment records` });
    } catch (error) {
      console.error("Error processing equipment email:", error);
      res.status(500).json({ error: "Failed to process equipment email" });
    }
  });

  // Simulate daily email webhook (for testing)
  app.post("/api/simulate-email", uploadExcel.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      await emailProcessor.simulateEmailReceived(req.file.buffer);
      res.json({ success: true, message: "Email simulation completed" });
    } catch (error) {
      console.error("Error simulating email:", error);
      res.status(500).json({ error: "Failed to simulate email" });
    }
  });

  // Email webhook endpoint for automatic processing
  app.post("/api/email-webhook", async (req, res) => {
    await emailWebhookService.handleEmailWebhook(req, res);
  });

  // Get email setup instructions
  app.get("/api/email-setup", (req, res) => {
    res.json({
      instructions: emailWebhookService.getWebhookInstructions(),
      webhookUrl: `${req.protocol}://${req.get('host')}/api/email-webhook`,
      dedicatedEmail: "equipment-reports@your-domain.com"
    });
  });

  // CSV import routes for Dodge Data with dry-run support
  app.post("/api/import-dodge-csv", authenticate, uploadExcel.single('file'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No CSV file uploaded" });
      }

      const dryRun = req.query.dryRun === 'true';
      const results = await csvImportService.importDodgeCSV(req.file.buffer, req.userId, dryRun);
      
      const message = dryRun 
        ? `Dry-run completed: ${results.imported} would be imported, ${results.updated} would be updated, ${results.unchanged} unchanged, ${results.skipped} skipped`
        : `Import completed: ${results.imported} new jobs, ${results.updated} updated, ${results.unchanged} unchanged, ${results.skipped} skipped`;
      
      res.json({ 
        success: true,
        dryRun,
        message,
        results 
      });
    } catch (error) {
      console.error("Error importing Dodge CSV:", error);
      res.status(500).json({ 
        error: "Failed to import CSV",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Companies routes
  app.get("/api/companies", authenticate, async (req: AuthRequest, res) => {
    try {
      const { search, type } = req.query;
      const list = search || type
        ? await storage.searchCompanies({ search: search as string, type: type as string, userId: req.userId! })
        : await storage.getCompanies(req.userId);
      res.json(list);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.post("/api/companies", authenticate, async (req: AuthRequest, res) => {
    try {
      const data = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany({ ...data, userId: req.userId! });
      res.status(201).json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ error: "Failed to create company" });
    }
  });

  app.get("/api/companies/:id", authenticate, async (req: AuthRequest, res) => {
    try {
      const company = await storage.getCompanyById(req.params.id, req.userId);
      if (!company) return res.status(404).json({ error: "Company not found" });
      const companyContacts = await storage.getContactsByCompany(req.params.id, req.userId);
      const companyInteractions = await storage.getInteractions({ companyId: req.params.id, userId: req.userId, limit: 50 });
      res.json({ ...company, contacts: companyContacts, interactions: companyInteractions });
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  app.put("/api/companies/:id", authenticate, async (req: AuthRequest, res) => {
    try {
      const updates = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(req.params.id, updates, req.userId);
      if (!company) return res.status(404).json({ error: "Company not found" });
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ error: "Failed to update company" });
    }
  });

  app.delete("/api/companies/:id", authenticate, async (req: AuthRequest, res) => {
    try {
      const deleted = await storage.deleteCompany(req.params.id, req.userId);
      if (!deleted) return res.status(404).json({ error: "Company not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ error: "Failed to delete company" });
    }
  });

  // Contacts routes
  app.get("/api/contacts", authenticate, async (req: AuthRequest, res) => {
    try {
      const { search, companyId } = req.query;
      const list = await storage.getContacts({ userId: req.userId!, companyId: companyId as string | undefined, search: search as string | undefined });
      res.json(list);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", authenticate, async (req: AuthRequest, res) => {
    try {
      const data = insertContactSchema.parse(req.body);
      const contact = await storage.createContact({ ...data, userId: req.userId! });
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.get("/api/contacts/:id", authenticate, async (req: AuthRequest, res) => {
    try {
      const contact = await storage.getContactById(req.params.id, req.userId);
      if (!contact) return res.status(404).json({ error: "Contact not found" });
      const contactJobs = await storage.getContactJobs(req.params.id, req.userId);
      const contactInteractions = await storage.getInteractions({ contactId: req.params.id, userId: req.userId, limit: 50 });
      const company = contact.companyId ? await storage.getCompanyById(contact.companyId, req.userId) : null;
      res.json({ ...contact, jobs: contactJobs, interactions: contactInteractions, company });
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ error: "Failed to fetch contact" });
    }
  });

  app.put("/api/contacts/:id", authenticate, async (req: AuthRequest, res) => {
    try {
      const updates = insertContactSchema.partial().parse(req.body);
      const contact = await storage.updateContact(req.params.id, updates, req.userId);
      if (!contact) return res.status(404).json({ error: "Contact not found" });
      res.json(contact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", authenticate, async (req: AuthRequest, res) => {
    try {
      const deleted = await storage.deleteContact(req.params.id, req.userId);
      if (!deleted) return res.status(404).json({ error: "Contact not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  app.get("/api/contacts/:id/jobs", authenticate, async (req: AuthRequest, res) => {
    try {
      const jobs = await storage.getContactJobs(req.params.id, req.userId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching contact jobs:", error);
      res.status(500).json({ error: "Failed to fetch contact jobs" });
    }
  });

  app.get("/api/contacts/:id/interactions", authenticate, async (req: AuthRequest, res) => {
    try {
      const interactions = await storage.getInteractions({ contactId: req.params.id, userId: req.userId, limit: 100 });
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching contact interactions:", error);
      res.status(500).json({ error: "Failed to fetch interactions" });
    }
  });

  app.post("/api/contacts/:id/interactions", authenticate, async (req: AuthRequest, res) => {
    try {
      const data = insertInteractionSchema.parse(req.body);
      const contact = await storage.getContactById(req.params.id, req.userId);
      if (!contact) return res.status(404).json({ error: "Contact not found" });
      const interaction = await storage.createInteraction({
        ...data,
        userId: req.userId!,
        contactId: req.params.id,
        companyId: contact.companyId ?? undefined,
      });
      await storage.updateContact(req.params.id, {
        lastInteractionAt: interaction.occurredAt || new Date(),
        lastInteractionType: interaction.type,
      }, req.userId);
      if (contact.companyId) {
        await storage.updateCompany(contact.companyId, {
          lastInteractionAt: interaction.occurredAt || new Date(),
          lastInteractionType: interaction.type,
        }, req.userId);
      }
      res.status(201).json(interaction);
    } catch (error) {
      console.error("Error creating interaction:", error);
      res.status(500).json({ error: "Failed to create interaction" });
    }
  });

  app.post("/api/contacts/:contactId/jobs/:jobId", authenticate, async (req: AuthRequest, res) => {
    try {
      const { role } = req.body;
      const cj = await storage.assignContactToJob(req.params.contactId, req.params.jobId, role || "other", req.userId);
      res.status(201).json(cj);
    } catch (error) {
      console.error("Error assigning contact to job:", error);
      res.status(500).json({ error: "Failed to assign contact to job" });
    }
  });

  app.delete("/api/contacts/:contactId/jobs/:jobId", authenticate, async (req: AuthRequest, res) => {
    try {
      const deleted = await storage.removeContactFromJob(req.params.contactId, req.params.jobId, req.userId);
      if (!deleted) return res.status(404).json({ error: "Assignment not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Error removing contact from job:", error);
      res.status(500).json({ error: "Failed to remove contact from job" });
    }
  });

  // VCF import - will be implemented in Phase 3
  app.post("/api/import-contacts-vcf", authenticate, uploadVcf.single("file"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No VCF file uploaded" });
      const vcfImportService = (await import("./services/vcfImportService")).default;
      const results = await vcfImportService.importVcf(req.file.buffer, req.userId!);
      res.json({ success: true, results });
    } catch (error) {
      console.error("Error importing VCF:", error);
      res.status(500).json({
        error: "Failed to import VCF",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // KYC Master sales log CSV import
  app.post("/api/import-kyc-csv", authenticate, uploadExcel.single("file"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No CSV file uploaded" });
      const dryRun = req.query.dryRun === "true";
      const results = await importKycCsv(req.file.buffer, req.userId!, dryRun);
      const message = dryRun
        ? `Dry-run completed: ${results.companiesCreated} companies, ${results.contactsCreated} contacts, ${results.interactionsCreated} interactions would be created`
        : `Import completed: ${results.companiesCreated} companies, ${results.contactsCreated} contacts, ${results.interactionsCreated} interactions`;
      res.json({ success: true, dryRun, message, results });
    } catch (error) {
      console.error("Error importing KYC CSV:", error);
      res.status(500).json({
        error: "Failed to import KYC CSV",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Mark job as viewed
  app.put("/api/jobs/:id/mark-viewed", async (req, res) => {
    try {
      const { notes } = req.body;
      
      await db
        .update(jobs)
        .set({
          isViewed: true,
          viewedAt: new Date(),
          userNotes: notes || ''
        })
        .where(eq(jobs.id, req.params.id));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking job as viewed:", error);
      res.status(500).json({ error: "Failed to mark job as viewed" });
    }
  });

  // Update job notes with locked field tracking
  app.put("/api/jobs/:id/notes", authenticate, async (req: AuthRequest, res) => {
    try {
      const { notes } = req.body;
      
      // Get current job to update locked fields
      const [currentJob] = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, req.params.id), eq(jobs.userId, req.userId!)));
      
      if (!currentJob) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      const lockedFields = currentJob.lockedFields || [];
      if (!lockedFields.includes('userNotes')) {
        lockedFields.push('userNotes');
      }
      
      await db
        .update(jobs)
        .set({
          userNotes: notes || '',
          lockedFields: lockedFields
        })
        .where(and(eq(jobs.id, req.params.id), eq(jobs.userId, req.userId!)));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating job notes:", error);
      res.status(500).json({ error: "Failed to update job notes" });
    }
  });

  // Update job team information with locked field tracking  
  app.put("/api/jobs/:id/team", authenticate, async (req: AuthRequest, res) => {
    try {
      const { contractor, owner, architect, orderedBy, officeContact } = req.body;
      
      // Get current job to update locked fields
      const [currentJob] = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, req.params.id), eq(jobs.userId, req.userId!)));
      
      if (!currentJob) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      const lockedFields = currentJob.lockedFields || [];
      const fieldsToLock = ['contractor', 'owner', 'architect', 'orderedBy', 'officeContact'];
      
      fieldsToLock.forEach(field => {
        if ((req.body as any)[field] !== undefined && !lockedFields.includes(field)) {
          lockedFields.push(field);
        }
      });
      
      await db
        .update(jobs)
        .set({
          contractor,
          owner,
          architect,
          orderedBy,
          officeContact,
          lockedFields
        })
        .where(and(eq(jobs.id, req.params.id), eq(jobs.userId, req.userId!)));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating job team:", error);
      res.status(500).json({ error: "Failed to update team information" });
    }
  });

  // Unlock fields for job - allows CSV imports to update them again
  app.post("/api/jobs/:id/unlock-fields", authenticate, async (req: AuthRequest, res) => {
    try {
      const { fields } = req.body;
      
      const [currentJob] = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, req.params.id), eq(jobs.userId, req.userId!)));
      
      if (!currentJob) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      let lockedFields = currentJob.lockedFields || [];
      
      if (fields && Array.isArray(fields)) {
        // Remove specific fields from locked list
        lockedFields = lockedFields.filter(f => !fields.includes(f));
      } else {
        // Unlock all fields
        lockedFields = [];
      }
      
      await db
        .update(jobs)
        .set({ lockedFields })
        .where(and(eq(jobs.id, req.params.id), eq(jobs.userId, req.userId!)));
      
      res.json({ success: true, lockedFields });
    } catch (error) {
      console.error("Error unlocking fields:", error);
      res.status(500).json({ error: "Failed to unlock fields" });
    }
  });
  
  // Mark job as cold
  app.post("/api/jobs/:id/cold", authenticate, async (req: AuthRequest, res) => {
    try {
      await db
        .update(jobs)
        .set({
          isCold: true
        })
        .where(and(eq(jobs.id, req.params.id), eq(jobs.userId, req.userId!)));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking job as cold:", error);
      res.status(500).json({ error: "Failed to mark job as cold" });
    }
  });

  // Unmark job as cold
  app.delete("/api/jobs/:id/cold", authenticate, async (req: AuthRequest, res) => {
    try {
      await db
        .update(jobs)
        .set({
          isCold: false
        })
        .where(and(eq(jobs.id, req.params.id), eq(jobs.userId, req.userId!)));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error unmarking job as cold:", error);
      res.status(500).json({ error: "Failed to unmark job as cold" });
    }
  });

  // Mark job as favorite
  app.post("/api/jobs/:id/favorite", authenticate, async (req: AuthRequest, res) => {
    try {
      await db
        .update(jobs)
        .set({
          isFavorite: true
        })
        .where(and(eq(jobs.id, req.params.id), eq(jobs.userId, req.userId!)));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking job as favorite:", error);
      res.status(500).json({ error: "Failed to mark job as favorite" });
    }
  });

  // Unmark job as favorite
  app.delete("/api/jobs/:id/favorite", authenticate, async (req: AuthRequest, res) => {
    try {
      await db
        .update(jobs)
        .set({
          isFavorite: false
        })
        .where(and(eq(jobs.id, req.params.id), eq(jobs.userId, req.userId!)));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error unmarking job as favorite:", error);
      res.status(500).json({ error: "Failed to unmark job as favorite" });
    }
  });

  // Mark job as visited (updates visit timestamp without changing temperature)
  app.patch("/api/jobs/:id/visit", authenticate, async (req: AuthRequest, res) => {
    try {
      const [currentJob] = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, req.params.id), eq(jobs.userId, req.userId!)));
      
      if (!currentJob) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      await db
        .update(jobs)
        .set({
          visited: true,
          temperatureSetAt: new Date()
        })
        .where(and(eq(jobs.id, req.params.id), eq(jobs.userId, req.userId!)));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking job as visited:", error);
      res.status(500).json({ error: "Failed to mark job as visited" });
    }
  });

  // Update job temperature (or reset to default). Reset clears temperature only; visit tracking is preserved.
  app.patch("/api/jobs/:id/temperature", authenticate, async (req: AuthRequest, res) => {
    try {
      const { temperature } = req.body;
      const isReset =
        temperature === null ||
        temperature === undefined ||
        temperature === "" ||
        temperature === "default";
      
      if (!isReset && !['hot', 'warm', 'cold', 'green'].includes(temperature)) {
        return res.status(400).json({ error: 'Invalid temperature value' });
      }
      
      // Get current job to check if temperature is being set for first time
      const [currentJob] = await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.id, req.params.id), eq(jobs.userId, req.userId!)));
      
      if (!currentJob) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      const updateData: any = isReset
        ? { temperature: null }
        : { temperature: temperature as any };
      
      // If temperature is being set (not reset), also mark as visited and set timestamp
      if (!isReset && (!currentJob.temperature || !currentJob.visited)) {
        updateData.visited = true;
        updateData.temperatureSetAt = new Date();
      }
      
      await db
        .update(jobs)
        .set(updateData)
        .where(and(eq(jobs.id, req.params.id), eq(jobs.userId, req.userId!)));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating job temperature:", error);
      res.status(500).json({ error: "Failed to update temperature" });
    }
  });

  const httpServer = createServer(app);
  // Debug endpoint to check database status
  app.get('/api/debug/job-count', async (req, res) => {
    try {
      const totalJobs = await db.select({ count: sql`count(*)` }).from(jobs);
      const jobsWithDodgeId = await db.select({ count: sql`count(*)` }).from(jobs).where(isNotNull(jobs.dodgeJobId));
      const viewedJobs = await db.select({ count: sql`count(*)` }).from(jobs).where(eq(jobs.isViewed, true));
      
      res.json({
        totalJobs: totalJobs[0].count,
        jobsWithDodgeId: jobsWithDodgeId[0].count,
        viewedJobs: viewedJobs[0].count,
        unviewedJobs: Number(totalJobs[0].count) - Number(viewedJobs[0].count)
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get job counts' });
    }
  });

  // Clear all jobs endpoint for testing
  app.delete('/api/debug/clear-jobs', async (req, res) => {
    try {
      const result = await db.delete(jobs);
      res.json({ 
        success: true, 
        message: 'All jobs cleared from database',
        deletedCount: result.rowCount || 0
      });
    } catch (error) {
      console.error('Error clearing jobs:', error);
      res.status(500).json({ error: 'Failed to clear jobs' });
    }
  });

  // Geocode missing coordinates
  app.post('/api/geocode-missing', async (req, res) => {
    try {
      const { type, limit } = req.query;
      const batchLimit = Math.min(parseInt((limit as string) || '50', 10) || 50, 500);

      const conditions = [
        sql`${jobs.latitude} IS NULL AND ${jobs.address} IS NOT NULL`
      ];

      if (type && typeof type === 'string') {
        conditions.push(eq(jobs.type, type));
      }

      const jobsWithoutCoords = await db
        .select()
        .from(jobs)
        .where(and(...conditions))
        .limit(batchLimit); // Process in batches to avoid API limits

      console.log(`Found ${jobsWithoutCoords.length} jobs without coordinates`);

      let geocoded = 0;
      let failed = 0;

      for (const job of jobsWithoutCoords) {
        if (job.address) {
          try {
            const coords = await geocodeAddress(job.address);
            if (coords) {
              await db
                .update(jobs)
                .set({
                  latitude: coords.lat.toString(),
                  longitude: coords.lng.toString()
                })
                .where(eq(jobs.id, job.id));
              geocoded++;
            } else {
              failed++;
            }
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`Failed to geocode job ${job.id}:`, error);
            failed++;
          }
        }
      }

      res.json({
        success: true,
        message: `Geocoding completed: ${geocoded} successful, ${failed} failed`,
        geocoded,
        failed,
        remaining: jobsWithoutCoords.length === batchLimit ? 'More jobs may need geocoding' : 'All jobs processed'
      });
    } catch (error) {
      console.error('Error geocoding jobs:', error);
      res.status(500).json({ error: 'Failed to geocode jobs' });
    }
  });

  return httpServer;
}
