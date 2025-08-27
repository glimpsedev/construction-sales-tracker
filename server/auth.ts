import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { users } from '@shared/schema';
import { db } from './db';
import { eq } from 'drizzle-orm';

// Secret key for JWT (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'construction-tracker-secret-key-2025';

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

/**
 * Authentication middleware
 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }
  
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
  
  // Verify user exists
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  req.userId = payload.userId;
  next();
}

/**
 * Create initial user account if it doesn't exist
 */
export async function createInitialUser() {
  const email = 'hgrady@jscole.com';
  const password = 'Duke1234';
  
  try {
    // Check if user already exists
    const [existingUser] = await db.select().from(users).where(eq(users.email, email));
    
    if (!existingUser) {
      // Create user
      const hashedPassword = await hashPassword(password);
      const [newUser] = await db.insert(users).values({
        email,
        password: hashedPassword,
        verified: true // Mark initial user as verified
      }).returning();
      
      console.log('Initial user created:', email);
      return newUser;
    } else {
      console.log('User already exists:', email);
      return existingUser;
    }
  } catch (error) {
    console.error('Error creating initial user:', error);
  }
}