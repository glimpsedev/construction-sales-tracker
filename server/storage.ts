import { jobs, equipment, documents, users, emailVerifications, type Job, type InsertJob, type Equipment, type InsertEquipment, type Document, type InsertDocument, type User, type InsertUser, type EmailVerification, type InsertEmailVerification } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, ilike, gte, lte, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser & { verified?: boolean }): Promise<User>;
  updateUserVerificationStatus(userId: string, verified: boolean): Promise<void>;
  
  // Email verification methods
  createEmailVerification(verification: InsertEmailVerification): Promise<EmailVerification>;
  getEmailVerification(token: string): Promise<EmailVerification | undefined>;
  deleteEmailVerification(token: string): Promise<void>;
  deleteExpiredVerifications(): Promise<void>;

  // Job methods
  getAllJobs(userId?: string): Promise<Job[]>;
  getJobById(id: string, userId?: string): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, updates: Partial<InsertJob>, userId?: string): Promise<Job | undefined>;
  deleteJob(id: string, userId?: string): Promise<boolean>;
  searchJobs(filters: {
    search?: string;
    status?: string[];
    type?: string[];
    temperature?: string[];
    startDate?: Date;
    endDate?: Date;
    minValue?: number;
    maxValue?: number;
    cold?: boolean;
    userId?: string;
  }): Promise<Job[]>;
  getJobByDodgeId(dodgeId: string, userId?: string): Promise<Job | undefined>;

  // Equipment methods
  getEquipmentByJobId(jobId: string, userId?: string): Promise<Equipment[]>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: string, updates: Partial<InsertEquipment>, userId?: string): Promise<Equipment | undefined>;

  // Document methods
  getAllDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentById(id: string): Promise<Document | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private jobsMap: Map<string, Job>;
  private equipmentMap: Map<string, Equipment>;
  private documentsMap: Map<string, Document>;
  private emailVerificationsMap: Map<string, EmailVerification>;

  constructor() {
    this.users = new Map();
    this.jobsMap = new Map();
    this.equipmentMap = new Map();
    this.documentsMap = new Map();
    this.emailVerificationsMap = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser & { verified?: boolean }): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      verified: insertUser.verified ?? false,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserVerificationStatus(userId: string, verified: boolean): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.verified = verified;
    }
  }

  async createEmailVerification(verification: InsertEmailVerification): Promise<EmailVerification> {
    const id = randomUUID();
    const emailVerification: EmailVerification = {
      ...verification,
      id,
      createdAt: new Date(),
    };
    this.emailVerificationsMap.set(verification.token, emailVerification);
    return emailVerification;
  }

  async getEmailVerification(token: string): Promise<EmailVerification | undefined> {
    return this.emailVerificationsMap.get(token);
  }

  async deleteEmailVerification(token: string): Promise<void> {
    this.emailVerificationsMap.delete(token);
  }

  async deleteExpiredVerifications(): Promise<void> {
    const now = new Date();
    for (const [token, verification] of this.emailVerificationsMap.entries()) {
      if (verification.expiresAt < now) {
        this.emailVerificationsMap.delete(token);
      }
    }
  }

  async getAllJobs(userId?: string): Promise<Job[]> {
    const allJobs = Array.from(this.jobsMap.values());
    const filtered = userId ? allJobs.filter(job => job.userId === userId) : allJobs;
    return filtered.sort(
      (a, b) => new Date(b.lastUpdated || b.createdAt!).getTime() - new Date(a.lastUpdated || a.createdAt!).getTime()
    );
  }

  async getJobById(id: string, userId?: string): Promise<Job | undefined> {
    const job = this.jobsMap.get(id);
    if (job && userId && job.userId !== userId) {
      return undefined;
    }
    return job;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const id = randomUUID();
    const now = new Date();
    const newJob: Job = { 
      ...job, 
      id, 
      createdAt: now,
      lastUpdated: now 
    };
    this.jobsMap.set(id, newJob);
    return newJob;
  }

  async updateJob(id: string, updates: Partial<InsertJob>, userId?: string): Promise<Job | undefined> {
    const job = this.jobsMap.get(id);
    if (!job) return undefined;
    if (userId && job.userId !== userId) return undefined;
    
    const updatedJob = { ...job, ...updates, lastUpdated: new Date() };
    this.jobsMap.set(id, updatedJob);
    return updatedJob;
  }

  async deleteJob(id: string, userId?: string): Promise<boolean> {
    const job = this.jobsMap.get(id);
    if (job && userId && job.userId !== userId) return false;
    return this.jobsMap.delete(id);
  }

  async searchJobs(filters: {
    search?: string;
    status?: string[];
    type?: string[];
    temperature?: string[];
    startDate?: Date;
    endDate?: Date;
    minValue?: number;
    maxValue?: number;
    viewStatus?: string;
    userId?: string;
  }): Promise<Job[]> {
    let result = Array.from(this.jobsMap.values());
    
    if (filters.userId) {
      result = result.filter(job => job.userId === filters.userId);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(job => 
        job.name.toLowerCase().includes(search) || 
        job.address.toLowerCase().includes(search) ||
        job.contractor?.toLowerCase().includes(search)
      );
    }

    if (filters.status && filters.status.length > 0) {
      result = result.filter(job => filters.status!.includes(job.status));
    }

    if (filters.type && filters.type.length > 0) {
      result = result.filter(job => filters.type!.includes(job.type));
    }

    if (filters.temperature && filters.temperature.length > 0) {
      result = result.filter(job => job.temperature && filters.temperature!.includes(job.temperature));
    }
    
    if (filters.cold !== undefined) {
      result = result.filter(job => job.isCold === filters.cold);
    }

    if (filters.startDate) {
      result = result.filter(job => 
        job.startDate && new Date(job.startDate) >= filters.startDate!
      );
    }

    if (filters.endDate) {
      result = result.filter(job => 
        job.endDate && new Date(job.endDate) <= filters.endDate!
      );
    }

    if (filters.minValue !== undefined || filters.maxValue !== undefined) {
      result = result.filter(job => {
        // Handle null/undefined projectValue
        if (!job.projectValue) return false;
        
        const value = parseFloat(job.projectValue);
        if (isNaN(value)) return false;
        
        const minCheck = filters.minValue === undefined || value >= filters.minValue;
        const maxCheck = filters.maxValue === undefined || value <= filters.maxValue;
        
        return minCheck && maxCheck;
      });
    }

    return result.sort(
      (a, b) => new Date(b.lastUpdated || b.createdAt!).getTime() - new Date(a.lastUpdated || a.createdAt!).getTime()
    );
  }

  async getJobByDodgeId(dodgeId: string, userId?: string): Promise<Job | undefined> {
    const job = Array.from(this.jobsMap.values()).find(job => job.dodgeJobId === dodgeId);
    if (job && userId && job.userId !== userId) return undefined;
    return job;
  }

  async getEquipmentByJobId(jobId: string, userId?: string): Promise<Equipment[]> {
    const equipment = Array.from(this.equipmentMap.values()).filter(eq => eq.jobId === jobId);
    if (userId) {
      return equipment.filter(eq => eq.userId === userId);
    }
    return equipment;
  }

  async createEquipment(equipment: InsertEquipment): Promise<Equipment> {
    const id = randomUUID();
    const newEquipment: Equipment = { ...equipment, id, createdAt: new Date() };
    this.equipmentMap.set(id, newEquipment);
    return newEquipment;
  }

  async updateEquipment(id: string, updates: Partial<InsertEquipment>, userId?: string): Promise<Equipment | undefined> {
    const equipment = this.equipmentMap.get(id);
    if (!equipment) return undefined;
    if (userId && equipment.userId !== userId) return undefined;
    
    const updatedEquipment = { ...equipment, ...updates };
    this.equipmentMap.set(id, updatedEquipment);
    return updatedEquipment;
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documentsMap.values()).sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const now = new Date();
    const newDocument: Document = { 
      ...document, 
      id, 
      createdAt: now,
      processedAt: now 
    };
    this.documentsMap.set(id, newDocument);
    return newDocument;
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    return this.documentsMap.get(id);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser & { verified?: boolean }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        verified: insertUser.verified ?? false
      })
      .returning();
    return user;
  }

  async updateUserVerificationStatus(userId: string, verified: boolean): Promise<void> {
    await db.update(users).set({ verified }).where(eq(users.id, userId));
  }

  async createEmailVerification(verification: InsertEmailVerification): Promise<EmailVerification> {
    const [newVerification] = await db.insert(emailVerifications).values(verification).returning();
    return newVerification;
  }

  async getEmailVerification(token: string): Promise<EmailVerification | undefined> {
    const [verification] = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.token, token))
      .limit(1);
    return verification;
  }

  async deleteEmailVerification(token: string): Promise<void> {
    await db.delete(emailVerifications).where(eq(emailVerifications.token, token));
  }

  async deleteExpiredVerifications(): Promise<void> {
    await db.delete(emailVerifications).where(lte(emailVerifications.expiresAt, new Date()));
  }

  async getAllJobs(userId?: string): Promise<Job[]> {
    if (userId) {
      return await db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.lastUpdated));
    }
    return await db.select().from(jobs).orderBy(desc(jobs.lastUpdated));
  }

  async getJobById(id: string, userId?: string): Promise<Job | undefined> {
    const conditions = [eq(jobs.id, id)];
    if (userId) {
      conditions.push(eq(jobs.userId, userId));
    }
    const [job] = await db.select().from(jobs).where(and(...conditions));
    return job || undefined;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [createdJob] = await db
      .insert(jobs)
      .values(job)
      .returning();
    return createdJob;
  }

  async updateJob(id: string, updates: Partial<InsertJob>, userId?: string): Promise<Job | undefined> {
    const conditions = [eq(jobs.id, id)];
    if (userId) {
      conditions.push(eq(jobs.userId, userId));
    }
    const [updatedJob] = await db
      .update(jobs)
      .set({ ...updates, lastUpdated: new Date() })
      .where(and(...conditions))
      .returning();
    return updatedJob || undefined;
  }

  async deleteJob(id: string, userId?: string): Promise<boolean> {
    const conditions = [eq(jobs.id, id)];
    if (userId) {
      conditions.push(eq(jobs.userId, userId));
    }
    const result = await db.delete(jobs).where(and(...conditions));
    return result.rowCount > 0;
  }

  async searchJobs(filters: {
    status?: string[];
    type?: string[];
    temperature?: string[];
    startDate?: Date;
    endDate?: Date;
    minValue?: number;
    maxValue?: number;
    viewStatus?: string;
    userId?: string;
  }): Promise<Job[]> {
    let query = db.select().from(jobs);
    const conditions = [];
    
    if (filters.userId) {
      conditions.push(eq(jobs.userId, filters.userId));
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(jobs.status, filters.status as any));
    }

    // Legacy type filter - ignored for backward compatibility with old URLs

    if (filters.temperature && filters.temperature.length > 0) {
      conditions.push(inArray(jobs.temperature, filters.temperature as any));
    }
    
    if (filters.cold !== undefined) {
      conditions.push(eq(jobs.isCold, filters.cold));
    }

    if (filters.startDate) {
      conditions.push(gte(jobs.startDate, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(jobs.endDate, filters.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    let result = await query.orderBy(desc(jobs.lastUpdated));
    
    // Apply value filtering on the result set
    // projectValue is stored as decimal type
    result = result.filter(job => {
      // Handle null/undefined projectValue
      if (job.projectValue === null || job.projectValue === undefined) return false;
      
      // Convert decimal to number
      const value = parseFloat(job.projectValue.toString());
      if (isNaN(value)) return false;
      
      const minCheck = filters.minValue === undefined || value >= filters.minValue;
      // If maxValue is 100M, treat as unbounded (no upper limit)
      const maxCheck = filters.maxValue === undefined || 
                      filters.maxValue === 100000000 || 
                      value <= filters.maxValue;
      
      return minCheck && maxCheck;
    });
    return result;
  }

  async getJobByDodgeId(dodgeId: string, userId?: string): Promise<Job | undefined> {
    const conditions = [eq(jobs.dodgeJobId, dodgeId)];
    if (userId) {
      conditions.push(eq(jobs.userId, userId));
    }
    const [job] = await db.select().from(jobs).where(and(...conditions));
    return job || undefined;
  }

  async getEquipmentByJobId(jobId: string, userId?: string): Promise<Equipment[]> {
    const conditions = [eq(equipment.jobId, jobId)];
    if (userId) {
      conditions.push(eq(equipment.userId, userId));
    }
    return await db.select().from(equipment).where(and(...conditions));
  }

  async createEquipment(equipmentData: InsertEquipment): Promise<Equipment> {
    const [createdEquipment] = await db
      .insert(equipment)
      .values(equipmentData)
      .returning();
    return createdEquipment;
  }

  async updateEquipment(id: string, updates: Partial<InsertEquipment>, userId?: string): Promise<Equipment | undefined> {
    const conditions = [eq(equipment.id, id)];
    if (userId) {
      conditions.push(eq(equipment.userId, userId));
    }
    const [updatedEquipment] = await db
      .update(equipment)
      .set(updates)
      .where(and(...conditions))
      .returning();
    return updatedEquipment || undefined;
  }

  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [createdDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return createdDocument;
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }
}

export const storage = new DatabaseStorage();
