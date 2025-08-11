import { jobs, equipment, documents, type Job, type InsertJob, type Equipment, type InsertEquipment, type Document, type InsertDocument, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ilike, gte, lte, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Job methods
  getAllJobs(): Promise<Job[]>;
  getJobById(id: string): Promise<Job | undefined>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: string): Promise<boolean>;
  searchJobs(filters: {
    search?: string;
    status?: string[];
    type?: string[];
    temperature?: string[];
    startDate?: Date;
    endDate?: Date;
    minValue?: number;
    maxValue?: number;
  }): Promise<Job[]>;
  getJobByDodgeId(dodgeId: string): Promise<Job | undefined>;

  // Equipment methods
  getEquipmentByJobId(jobId: string): Promise<Equipment[]>;
  createEquipment(equipment: InsertEquipment): Promise<Equipment>;
  updateEquipment(id: string, updates: Partial<InsertEquipment>): Promise<Equipment | undefined>;

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

  constructor() {
    this.users = new Map();
    this.jobsMap = new Map();
    this.equipmentMap = new Map();
    this.documentsMap = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllJobs(): Promise<Job[]> {
    return Array.from(this.jobsMap.values()).sort(
      (a, b) => new Date(b.lastUpdated || b.createdAt!).getTime() - new Date(a.lastUpdated || a.createdAt!).getTime()
    );
  }

  async getJobById(id: string): Promise<Job | undefined> {
    return this.jobsMap.get(id);
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

  async updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const job = this.jobsMap.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, ...updates, lastUpdated: new Date() };
    this.jobsMap.set(id, updatedJob);
    return updatedJob;
  }

  async deleteJob(id: string): Promise<boolean> {
    return this.jobsMap.delete(id);
  }

  async searchJobs(filters: {
    search?: string;
    status?: string[];
    type?: string[];
    startDate?: Date;
    endDate?: Date;
    minValue?: number;
    maxValue?: number;
  }): Promise<Job[]> {
    let result = Array.from(this.jobsMap.values());

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

    if (filters.minValue !== undefined) {
      result = result.filter(job => 
        job.projectValue && parseFloat(job.projectValue) >= filters.minValue!
      );
    }

    if (filters.maxValue !== undefined) {
      result = result.filter(job => 
        job.projectValue && parseFloat(job.projectValue) <= filters.maxValue!
      );
    }

    return result.sort(
      (a, b) => new Date(b.lastUpdated || b.createdAt!).getTime() - new Date(a.lastUpdated || a.createdAt!).getTime()
    );
  }

  async getJobByDodgeId(dodgeId: string): Promise<Job | undefined> {
    return Array.from(this.jobsMap.values()).find(job => job.dodgeJobId === dodgeId);
  }

  async getEquipmentByJobId(jobId: string): Promise<Equipment[]> {
    return Array.from(this.equipmentMap.values()).filter(eq => eq.jobId === jobId);
  }

  async createEquipment(equipment: InsertEquipment): Promise<Equipment> {
    const id = randomUUID();
    const newEquipment: Equipment = { ...equipment, id, createdAt: new Date() };
    this.equipmentMap.set(id, newEquipment);
    return newEquipment;
  }

  async updateEquipment(id: string, updates: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    const equipment = this.equipmentMap.get(id);
    if (!equipment) return undefined;
    
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllJobs(): Promise<Job[]> {
    return await db.select().from(jobs).orderBy(desc(jobs.lastUpdated));
  }

  async getJobById(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job || undefined;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [createdJob] = await db
      .insert(jobs)
      .values(job)
      .returning();
    return createdJob;
  }

  async updateJob(id: string, updates: Partial<InsertJob>): Promise<Job | undefined> {
    const [updatedJob] = await db
      .update(jobs)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return updatedJob || undefined;
  }

  async deleteJob(id: string): Promise<boolean> {
    const result = await db.delete(jobs).where(eq(jobs.id, id));
    return result.rowCount > 0;
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
  }): Promise<Job[]> {
    let query = db.select().from(jobs);
    const conditions = [];

    if (filters.search) {
      conditions.push(
        ilike(jobs.name, `%${filters.search}%`),
        ilike(jobs.address, `%${filters.search}%`),
        ilike(jobs.contractor, `%${filters.search}%`)
      );
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(jobs.status, filters.status as any));
    }

    if (filters.type && filters.type.length > 0) {
      conditions.push(inArray(jobs.type, filters.type as any));
    }

    if (filters.temperature && filters.temperature.length > 0) {
      conditions.push(inArray(jobs.temperature, filters.temperature as any));
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

    const result = await query.orderBy(desc(jobs.lastUpdated));
    return result;
  }

  async getJobByDodgeId(dodgeId: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.dodgeJobId, dodgeId));
    return job || undefined;
  }

  async getEquipmentByJobId(jobId: string): Promise<Equipment[]> {
    return await db.select().from(equipment).where(eq(equipment.jobId, jobId));
  }

  async createEquipment(equipmentData: InsertEquipment): Promise<Equipment> {
    const [createdEquipment] = await db
      .insert(equipment)
      .values(equipmentData)
      .returning();
    return createdEquipment;
  }

  async updateEquipment(id: string, updates: Partial<InsertEquipment>): Promise<Equipment | undefined> {
    const [updatedEquipment] = await db
      .update(equipment)
      .set(updates)
      .where(eq(equipment.id, id))
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
