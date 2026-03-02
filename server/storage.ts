import { jobs, equipment, documents, users, emailVerifications, companies, contacts, contactJobs, interactions, type Job, type InsertJob, type Equipment, type InsertEquipment, type Document, type InsertDocument, type User, type InsertUser, type EmailVerification, type InsertEmailVerification, type FilterPreferences, type Company, type InsertCompany, type Contact, type InsertContact, type ContactJob, type InsertContactJob, type Interaction, type InsertInteraction } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, ilike, gte, lte, inArray, sql } from "drizzle-orm";
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
    county?: string;
    company?: string;
    nearLat?: number;
    nearLng?: number;
    unvisited?: boolean;
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

  // Filter preferences methods
  getFilterPreferences(userId: string): Promise<FilterPreferences | null>;
  updateFilterPreferences(userId: string, preferences: FilterPreferences): Promise<void>;

  // Company methods
  getCompanies(userId?: string): Promise<Company[]>;
  getCompanyById(id: string, userId?: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, updates: Partial<InsertCompany>, userId?: string): Promise<Company | undefined>;
  deleteCompany(id: string, userId?: string): Promise<boolean>;
  searchCompanies(filters: { search?: string; type?: string; userId?: string }): Promise<Company[]>;
  getCompanyByNormalizedName(normalizedName: string, userId?: string): Promise<Company | undefined>;

  // Contact methods
  getContacts(filters?: { userId?: string; companyId?: string; search?: string; tags?: string[] }): Promise<Contact[]>;
  getContactById(id: string, userId?: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, updates: Partial<InsertContact>, userId?: string): Promise<Contact | undefined>;
  deleteContact(id: string, userId?: string): Promise<boolean>;
  searchContacts(filters: { search?: string; companyId?: string; userId?: string }): Promise<Contact[]>;
  getContactsByCompany(companyId: string, userId?: string): Promise<Contact[]>;
  getContactsByJob(jobId: string, userId?: string): Promise<(Contact & { contactJob: ContactJob })[]>;

  // Contact-job junction methods
  assignContactToJob(contactId: string, jobId: string, role: string, userId?: string): Promise<ContactJob>;
  removeContactFromJob(contactId: string, jobId: string, userId?: string): Promise<boolean>;
  getJobContacts(jobId: string, userId?: string): Promise<(ContactJob & { contact: Contact })[]>;
  getContactJobs(contactId: string, userId?: string): Promise<(ContactJob & { job: Job })[]>;

  // Interaction methods
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  getInteractions(filters: { contactId?: string; companyId?: string; jobId?: string; userId?: string; limit?: number }): Promise<Interaction[]>;
  getLastInteraction(contactId?: string, companyId?: string): Promise<Interaction | undefined>;
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
    for (const [token, verification] of Array.from(this.emailVerificationsMap.entries())) {
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
      email: job.email || null,
      type: job.type || 'commercial',
      status: job.status || 'active',
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
    
    const updatedJob = { 
      ...job, 
      ...updates, 
      lastUpdated: new Date(),
      lockedFields: Array.isArray(updates.lockedFields) ? updates.lockedFields.slice() : job.lockedFields
    };
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
    cold?: boolean;
    viewStatus?: string;
    userId?: string;
    unvisited?: boolean;
    offices?: boolean;
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
      result = result.filter(job => {
        if (filters.offices === true && job.type === 'office') return true;
        return filters.status!.includes(job.status);
      });
    }

    if (filters.offices === false) {
      result = result.filter(job => job.type !== 'office');
    }

    if (filters.type && filters.type.length > 0) {
      result = result.filter(job => filters.type!.includes(job.type));
    }

    // Handle temperature and unvisited filters with OR logic when both are present
    // This allows unvisited jobs to be shown alongside jobs matching temperature filters
    if ((filters.temperature && filters.temperature.length > 0) || filters.unvisited === true) {
      result = result.filter(job => {
        const matchesTemperature = filters.temperature && filters.temperature.length > 0 
          ? (job.temperature && filters.temperature.includes(job.temperature))
          : false;
        const matchesUnvisited = filters.unvisited === true 
          ? !job.visited
          : false;
        const matchesOffice = filters.offices === true 
          ? job.type === 'office'
          : false;
        // Show job if it matches temperature filter OR unvisited filter
        return matchesTemperature || matchesUnvisited || matchesOffice;
      });
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
        // Offices should remain visible even when value filters are set
        if (job.type === 'office') return true;

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
    const newEquipment: Equipment = { 
      ...equipment,
      userId: equipment.userId || null,
      jobId: equipment.jobId || null,
      id, 
      createdAt: new Date() 
    };
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
      extractedData: document.extractedData || null,
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

  async getFilterPreferences(userId: string): Promise<FilterPreferences | null> {
    const user = this.users.get(userId);
    return user?.filterPreferences || null;
  }

  async updateFilterPreferences(userId: string, preferences: FilterPreferences): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.filterPreferences = preferences;
    }
  }

  async getCompanies(): Promise<Company[]> { return []; }
  async getCompanyById(): Promise<Company | undefined> { return undefined; }
  async createCompany(company: InsertCompany): Promise<Company> {
    const id = randomUUID();
    const now = new Date();
    const newCompany: Company = { ...company, id, createdAt: now, updatedAt: now, tags: company.tags || [] } as Company;
    return newCompany;
  }
  async updateCompany(): Promise<Company | undefined> { return undefined; }
  async deleteCompany(): Promise<boolean> { return false; }
  async searchCompanies(): Promise<Company[]> { return []; }
  async getCompanyByNormalizedName(): Promise<Company | undefined> { return undefined; }

  async getContacts(): Promise<Contact[]> { return []; }
  async getContactById(): Promise<Contact | undefined> { return undefined; }
  async createContact(contact: InsertContact): Promise<Contact> {
    const id = randomUUID();
    const now = new Date();
    const newContact: Contact = { ...contact, id, createdAt: now, updatedAt: now, tags: contact.tags || [] } as Contact;
    return newContact;
  }
  async updateContact(): Promise<Contact | undefined> { return undefined; }
  async deleteContact(): Promise<boolean> { return false; }
  async searchContacts(): Promise<Contact[]> { return []; }
  async getContactsByCompany(): Promise<Contact[]> { return []; }
  async getContactsByJob(): Promise<(Contact & { contactJob: ContactJob })[]> { return []; }

  async assignContactToJob(): Promise<ContactJob> { throw new Error("MemStorage: assignContactToJob not implemented"); }
  async removeContactFromJob(): Promise<boolean> { return false; }
  async getJobContacts(): Promise<(ContactJob & { contact: Contact })[]> { return []; }
  async getContactJobs(): Promise<(ContactJob & { job: Job })[]> { return []; }

  async createInteraction(interaction: InsertInteraction): Promise<Interaction> {
    const id = randomUUID();
    const now = new Date();
    const newInteraction: Interaction = { ...interaction, id, createdAt: now } as Interaction;
    return newInteraction;
  }
  async getInteractions(): Promise<Interaction[]> { return []; }
  async getLastInteraction(): Promise<Interaction | undefined> { return undefined; }
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
    return (result.rowCount || 0) > 0;
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
    county?: string;
    company?: string;
    nearLat?: number;
    nearLng?: number;
    unvisited?: boolean;
  }): Promise<Job[]> {
    let query = db.select().from(jobs);
    const conditions = [];
    
    if (filters.userId) {
      conditions.push(eq(jobs.userId, filters.userId));
    }

    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(jobs.name, term),
          ilike(jobs.address, term),
          ilike(jobs.contractor, term),
          ilike(jobs.county, term),
          ilike(jobs.owner, term)
        )!
      );
    }

    // County filter
    if (filters.county) {
      conditions.push(eq(jobs.county, filters.county));
    }

    // Company filter (case-insensitive exact match on contractor field - General Contractor/GC)
    if (filters.company) {
      conditions.push(ilike(jobs.contractor, filters.company));
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(jobs.status, filters.status as any));
    }

    // Legacy type filter - ignored for backward compatibility with old URLs

    // Handle temperature and unvisited filters with OR logic when both are present
    // This allows unvisited jobs to be shown alongside jobs matching temperature filters
    // When temperature array is empty, it means "all temperatures" are selected, so don't filter by temperature
    const temperatureOrUnvisitedConditions = [];
    
    // Only add temperature filter if specific temperatures are selected (not empty array)
    if (filters.temperature && filters.temperature.length > 0) {
      temperatureOrUnvisitedConditions.push(inArray(jobs.temperature, filters.temperature as any));
    }
    
    // Add unvisited condition if checked
    if (filters.unvisited === true) {
      temperatureOrUnvisitedConditions.push(eq(jobs.visited, false));
    }
    
    // Apply filters: if both are present, use OR; if only one, use that; if neither, show all
    if (temperatureOrUnvisitedConditions.length > 0) {
      if (temperatureOrUnvisitedConditions.length === 1) {
        // Only one condition (either temperature OR unvisited)
        conditions.push(temperatureOrUnvisitedConditions[0]);
      } else {
        // Both conditions present: show jobs that are unvisited OR match temperature filters
        conditions.push(or(...temperatureOrUnvisitedConditions));
      }
    }
    // If neither condition is present, don't filter by temperature/visited (show all jobs)
    
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
    
    // Apply value filtering on the result set since projectValue is a string
    if (filters.minValue !== undefined || filters.maxValue !== undefined) {
      result = result.filter(job => {
        // Handle null/undefined projectValue
        if (!job.projectValue) return false;
        
        // Remove non-numeric characters and parse value
        const cleanValue = job.projectValue.replace(/[^0-9.]/g, '');
        const value = parseFloat(cleanValue);
        if (isNaN(value)) return false;
        
        const minCheck = filters.minValue === undefined || value >= filters.minValue;
        // If maxValue is 100M, treat as unbounded (no upper limit)
        const maxCheck = filters.maxValue === undefined || 
                        filters.maxValue === 100000000 || 
                        value <= filters.maxValue;
        
        return minCheck && maxCheck;
      });
    }
    
    // Apply location-based filtering if nearLat and nearLng are provided
    if (filters.nearLat !== undefined && filters.nearLng !== undefined) {
      const radiusMiles = 25; // 25 mile radius
      result = result.filter(job => {
        if (!job.latitude || !job.longitude) return false;
        
        const jobLat = parseFloat(job.latitude);
        const jobLng = parseFloat(job.longitude);
        
        if (isNaN(jobLat) || isNaN(jobLng)) return false;
        
        // Calculate distance using Haversine formula
        const toRad = (x: number) => x * Math.PI / 180;
        const R = 3959; // Earth's radius in miles
        
        const dLat = toRad(jobLat - filters.nearLat!);
        const dLng = toRad(jobLng - filters.nearLng!);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(toRad(filters.nearLat!)) * Math.cos(toRad(jobLat)) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance <= radiusMiles;
      });
    }
    
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

  async getFilterPreferences(userId: string): Promise<FilterPreferences | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.filterPreferences || null;
  }

  async updateFilterPreferences(userId: string, preferences: FilterPreferences): Promise<void> {
    await db.update(users)
      .set({ filterPreferences: preferences })
      .where(eq(users.id, userId));
  }

  async getCompanies(userId?: string): Promise<Company[]> {
    if (userId) {
      return await db.select().from(companies).where(eq(companies.userId, userId)).orderBy(desc(companies.name));
    }
    return await db.select().from(companies).orderBy(desc(companies.name));
  }

  async getCompanyById(id: string, userId?: string): Promise<Company | undefined> {
    const conditions = [eq(companies.id, id)];
    if (userId) conditions.push(eq(companies.userId, userId));
    const [company] = await db.select().from(companies).where(and(...conditions));
    return company || undefined;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async updateCompany(id: string, updates: Partial<InsertCompany>, userId?: string): Promise<Company | undefined> {
    const conditions = [eq(companies.id, id)];
    if (userId) conditions.push(eq(companies.userId, userId));
    const [updated] = await db.update(companies).set({ ...updates, updatedAt: new Date() }).where(and(...conditions)).returning();
    return updated || undefined;
  }

  async deleteCompany(id: string, userId?: string): Promise<boolean> {
    const conditions = [eq(companies.id, id)];
    if (userId) conditions.push(eq(companies.userId, userId));
    const result = await db.delete(companies).where(and(...conditions));
    return (result.rowCount || 0) > 0;
  }

  async searchCompanies(filters: { search?: string; type?: string; userId?: string }): Promise<Company[]> {
    const conditions = [];
    if (filters.userId) conditions.push(eq(companies.userId, filters.userId));
    if (filters.search) conditions.push(or(ilike(companies.name, `%${filters.search}%`), ilike(companies.normalizedName, `%${filters.search}%`))!);
    if (filters.type) conditions.push(eq(companies.type, filters.type as any));
    let query = db.select().from(companies);
    if (conditions.length > 0) query = query.where(and(...conditions));
    return await query.orderBy(desc(companies.name));
  }

  async getCompanyByNormalizedName(normalizedName: string, userId?: string): Promise<Company | undefined> {
    const conditions = [ilike(companies.normalizedName, normalizedName)];
    if (userId) conditions.push(eq(companies.userId, userId));
    const [company] = await db.select().from(companies).where(and(...conditions));
    return company || undefined;
  }

  async getContacts(filters?: { userId?: string; companyId?: string; search?: string; tags?: string[] }): Promise<Contact[]> {
    const conditions = [];
    if (filters?.userId) conditions.push(eq(contacts.userId, filters.userId));
    if (filters?.companyId) conditions.push(eq(contacts.companyId, filters.companyId));
    if (filters?.search) {
      const term = `%${filters.search}%`;
      conditions.push(or(ilike(contacts.fullName, term), ilike(contacts.firstName, term), ilike(contacts.lastName, term), ilike(contacts.emailPrimary, term), ilike(contacts.phonePrimary, term))!);
    }
    let query = db.select().from(contacts);
    if (conditions.length > 0) query = query.where(and(...conditions));
    return await query.orderBy(desc(contacts.lastInteractionAt), desc(contacts.createdAt));
  }

  async getContactById(id: string, userId?: string): Promise<Contact | undefined> {
    const conditions = [eq(contacts.id, id)];
    if (userId) conditions.push(eq(contacts.userId, userId));
    const [contact] = await db.select().from(contacts).where(and(...conditions));
    return contact || undefined;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [created] = await db.insert(contacts).values(contact).returning();
    return created;
  }

  async updateContact(id: string, updates: Partial<InsertContact>, userId?: string): Promise<Contact | undefined> {
    const conditions = [eq(contacts.id, id)];
    if (userId) conditions.push(eq(contacts.userId, userId));
    const [updated] = await db.update(contacts).set({ ...updates, updatedAt: new Date() }).where(and(...conditions)).returning();
    return updated || undefined;
  }

  async deleteContact(id: string, userId?: string): Promise<boolean> {
    const conditions = [eq(contacts.id, id)];
    if (userId) conditions.push(eq(contacts.userId, userId));
    const result = await db.delete(contacts).where(and(...conditions));
    return (result.rowCount || 0) > 0;
  }

  async searchContacts(filters: { search?: string; companyId?: string; userId?: string }): Promise<Contact[]> {
    return this.getContacts({ userId: filters.userId, companyId: filters.companyId, search: filters.search });
  }

  async getContactsByCompany(companyId: string, userId?: string): Promise<Contact[]> {
    return this.getContacts({ companyId, userId });
  }

  async getContactsByJob(jobId: string, userId?: string): Promise<(Contact & { contactJob: ContactJob })[]> {
    const cjRows = await db.select().from(contactJobs).where(eq(contactJobs.jobId, jobId));
    const result: (Contact & { contactJob: ContactJob })[] = [];
    for (const cj of cjRows) {
      const contact = await this.getContactById(cj.contactId, userId);
      if (contact) result.push({ ...contact, contactJob: cj });
    }
    return result;
  }

  async assignContactToJob(contactId: string, jobId: string, role: string, userId?: string): Promise<ContactJob> {
    const contact = await this.getContactById(contactId, userId);
    if (!contact) throw new Error("Contact not found");
    const job = await this.getJobById(jobId, userId);
    if (!job) throw new Error("Job not found");
    const [created] = await db.insert(contactJobs).values({ contactId, jobId, role: role as any }).returning();
    return created;
  }

  async removeContactFromJob(contactId: string, jobId: string, userId?: string): Promise<boolean> {
    const conditions = [eq(contactJobs.contactId, contactId), eq(contactJobs.jobId, jobId)];
    const result = await db.delete(contactJobs).where(and(...conditions));
    return (result.rowCount || 0) > 0;
  }

  async getJobContacts(jobId: string, userId?: string): Promise<(ContactJob & { contact: Contact })[]> {
    const cjRows = await db.select().from(contactJobs).where(eq(contactJobs.jobId, jobId));
    const result: (ContactJob & { contact: Contact })[] = [];
    for (const cj of cjRows) {
      const contact = await this.getContactById(cj.contactId, userId);
      if (contact) result.push({ ...cj, contact });
    }
    return result;
  }

  async getContactJobs(contactId: string, userId?: string): Promise<(ContactJob & { job: Job })[]> {
    const cjRows = await db.select().from(contactJobs).where(eq(contactJobs.contactId, contactId));
    const result: (ContactJob & { job: Job })[] = [];
    for (const cj of cjRows) {
      const job = await this.getJobById(cj.jobId, userId);
      if (job) result.push({ ...cj, job });
    }
    return result;
  }

  async createInteraction(interaction: InsertInteraction): Promise<Interaction> {
    const [created] = await db.insert(interactions).values(interaction).returning();
    return created;
  }

  async getInteractions(filters: { contactId?: string; companyId?: string; jobId?: string; userId?: string; limit?: number }): Promise<Interaction[]> {
    const conditions = [];
    if (filters.contactId) conditions.push(eq(interactions.contactId, filters.contactId));
    if (filters.companyId) conditions.push(eq(interactions.companyId, filters.companyId));
    if (filters.jobId) conditions.push(eq(interactions.jobId, filters.jobId));
    if (filters.userId) conditions.push(eq(interactions.userId, filters.userId));
    let query = db.select().from(interactions);
    if (conditions.length > 0) query = query.where(and(...conditions));
    query = query.orderBy(desc(interactions.occurredAt));
    if (filters.limit) query = query.limit(filters.limit);
    return await query;
  }

  async getLastInteraction(contactId?: string, companyId?: string): Promise<Interaction | undefined> {
    const conditions = [];
    if (contactId) conditions.push(eq(interactions.contactId, contactId));
    if (companyId) conditions.push(eq(interactions.companyId, companyId));
    if (conditions.length === 0) return undefined;
    const [last] = await db.select().from(interactions).where(and(...conditions)).orderBy(desc(interactions.occurredAt)).limit(1);
    return last || undefined;
  }
}

export const storage = new DatabaseStorage();
