import { Router } from 'express';
import { storage } from './storage';
import { hashPassword, verifyPassword, generateToken } from './auth';
import { emailService } from './services/emailService';
import { registrationLimiter, resendLimiter, verificationLimiter, loginLimiter } from './middleware/rateLimiter';
import { randomBytes } from 'crypto';
import { z } from 'zod';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms of service')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const resendSchema = z.object({
  email: z.string().email(),
});

const verifySchema = z.object({
  token: z.string(),
});

// Generate secure random token
function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

// Register new user
router.post('/register', registrationLimiter, async (req, res) => {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(validatedData.email);
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email already registered',
        field: 'email'
      });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);
    
    // Create user (unverified by default)
    const user = await storage.createUser({
      email: validatedData.email,
      password: hashedPassword,
      verified: false
    });
    
    // Generate verification token
    const verifyToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Save verification token
    await storage.createEmailVerification({
      userId: user.id,
      token: verifyToken,
      expiresAt,
    });
    
    // Send verification email
    await emailService.sendVerificationEmail(user.email, verifyToken);
    
    res.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      email: user.email
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Verify email
router.post('/verify', verificationLimiter, async (req, res) => {
  try {
    const { token } = verifySchema.parse(req.body);
    
    // Get verification record
    const verification = await storage.getEmailVerification(token);
    if (!verification) {
      return res.status(400).json({
        error: 'Invalid or expired verification token'
      });
    }
    
    // Check if token expired
    if (verification.expiresAt < new Date()) {
      await storage.deleteEmailVerification(token);
      return res.status(400).json({
        error: 'Verification token has expired. Please request a new one.'
      });
    }
    
    // Mark user as verified
    await storage.updateUserVerificationStatus(verification.userId, true);
    
    // Delete verification token
    await storage.deleteEmailVerification(token);
    
    // Clean up expired tokens
    await storage.deleteExpiredVerifications();
    
    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.errors
      });
    }
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// Resend verification email
router.post('/resend', resendLimiter, async (req, res) => {
  try {
    const { email } = resendSchema.parse(req.body);
    
    // Get user
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account exists with this email, a new verification email has been sent.'
      });
    }
    
    // Check if already verified
    if (user.verified) {
      return res.status(400).json({
        error: 'This email is already verified.'
      });
    }
    
    // Generate new verification token
    const verifyToken = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Save new verification token
    await storage.createEmailVerification({
      userId: user.id,
      token: verifyToken,
      expiresAt,
    });
    
    // Send verification email
    await emailService.sendVerificationEmail(user.email, verifyToken);
    
    res.json({
      success: true,
      message: 'Verification email has been resent. Please check your email.'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.errors
      });
    }
    console.error('Resend error:', error);
    res.status(500).json({ error: 'Failed to resend email. Please try again later.' });
  }
});

// Enhanced login with verification check
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    // Get user
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is verified
    if (!user.verified) {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email before logging in.',
        needsVerification: true,
        email: user.email
      });
    }
    
    // Generate JWT token
    const token = generateToken(user.id);
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.errors
      });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;