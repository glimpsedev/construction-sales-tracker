import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertJobSchema, insertEquipmentSchema, insertDocumentSchema, jobs, type Job } from "@shared/schema";
import { eq, desc, and, or, gte, lte, sql, count, asc, isNotNull } from "drizzle-orm";
import { db } from "./db";

import { documentProcessor } from "./services/documentProcessor";
import { emailProcessor } from "./services/emailProcessor";
import { emailWebhookService } from "./services/emailWebhookService";
import { csvImportService } from "./services/csvImportService";
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Job routes
  app.get("/api/jobs", async (req, res) => {
    try {
      const {
        search,
        status,
        type,
        temperature,
        startDate,
        endDate,
        minValue,
        maxValue
      } = req.query;

      const filters = {
        search: search as string,
        status: status ? (status as string).split(',') : undefined,
        type: type ? (type as string).split(',') : undefined,
        temperature: temperature ? (temperature as string).split(',') : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        minValue: minValue ? parseFloat(minValue as string) : undefined,
        maxValue: maxValue ? parseFloat(maxValue as string) : undefined,
      };

      const jobs = await storage.searchJobs(filters);
      res.json(jobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJobById(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      // Get equipment for this job
      const equipment = await storage.getEquipmentByJobId(job.id);
      res.json({ ...job, equipment });
    } catch (error) {
      console.error('Error fetching job:', error);
      res.status(500).json({ error: 'Failed to fetch job' });
    }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      const jobData = insertJobSchema.parse(req.body);
      
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

  app.put("/api/jobs/:id", async (req, res) => {
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
      
      const job = await storage.updateJob(req.params.id, updates);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json(job);
    } catch (error) {
      console.error('Error updating job:', error);
      res.status(500).json({ error: 'Failed to update job' });
    }
  });

  app.delete("/api/jobs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteJob(req.params.id);
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
  app.get("/api/jobs/:jobId/equipment", async (req, res) => {
    try {
      const equipment = await storage.getEquipmentByJobId(req.params.jobId);
      res.json(equipment);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      res.status(500).json({ error: 'Failed to fetch equipment' });
    }
  });

  app.post("/api/equipment", async (req, res) => {
    try {
      const equipmentData = insertEquipmentSchema.parse(req.body);
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

  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });



  // Statistics route
  app.get("/api/stats", async (req, res) => {
    try {
      const allJobs = await storage.getAllJobs();
      
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

  // Geocoding utility route
  app.post("/api/geocode", async (req, res) => {
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

  // Process equipment status email (Excel file)
  app.post("/api/process-equipment-email", uploadExcel.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      await emailProcessor.processEquipmentStatusExcel(req.file.buffer);
      res.json({ success: true, message: "Equipment status processed successfully" });
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

  // CSV import routes for Dodge Data
  app.post("/api/import-dodge-csv", uploadExcel.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No CSV file uploaded" });
      }

      const results = await csvImportService.importDodgeCSV(req.file.buffer);
      res.json({ 
        success: true, 
        message: `Import completed: ${results.imported} new jobs, ${results.updated} updated, ${results.skipped} skipped`,
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

  // Update job notes
  app.put("/api/jobs/:id/notes", async (req, res) => {
    try {
      const { notes } = req.body;
      
      await db
        .update(jobs)
        .set({
          userNotes: notes || ''
        })
        .where(eq(jobs.id, req.params.id));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating job notes:", error);
      res.status(500).json({ error: "Failed to update job notes" });
    }
  });

  // Update job temperature
  app.patch("/api/jobs/:id/temperature", async (req, res) => {
    try {
      const { temperature } = req.body;
      
      if (!['hot', 'warm', 'cold'].includes(temperature)) {
        return res.status(400).json({ error: 'Invalid temperature value' });
      }
      
      await db
        .update(jobs)
        .set({
          temperature: temperature as any
        })
        .where(eq(jobs.id, req.params.id));
      
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
      const jobsWithoutCoords = await db
        .select()
        .from(jobs)
        .where(
          sql`${jobs.latitude} IS NULL AND ${jobs.address} IS NOT NULL`
        )
        .limit(50); // Process 50 at a time to avoid API limits

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
        remaining: jobsWithoutCoords.length === 50 ? 'More jobs may need geocoding' : 'All jobs processed'
      });
    } catch (error) {
      console.error('Error geocoding jobs:', error);
      res.status(500).json({ error: 'Failed to geocode jobs' });
    }
  });

  return httpServer;
}
