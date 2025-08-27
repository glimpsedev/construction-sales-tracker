import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isProduction = process.env.NODE_ENV === 'production';
  private devLogPath = path.join(process.cwd(), 'dev-emails.log');

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    if (this.isProduction) {
      // Configure production email provider (Resend, SendGrid, Postmark)
      const provider = process.env.EMAIL_PROVIDER || 'sendgrid';
      
      switch (provider) {
        case 'sendgrid':
          this.transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
              user: 'apikey',
              pass: process.env.SENDGRID_API_KEY || '',
            },
          });
          break;
        case 'resend':
          this.transporter = nodemailer.createTransport({
            host: 'smtp.resend.com',
            port: 587,
            secure: false,
            auth: {
              user: 'resend',
              pass: process.env.RESEND_API_KEY || '',
            },
          });
          break;
        case 'postmark':
          this.transporter = nodemailer.createTransport({
            host: 'smtp.postmarkapp.com',
            port: 587,
            secure: false,
            auth: {
              user: process.env.POSTMARK_SERVER_TOKEN || '',
              pass: process.env.POSTMARK_SERVER_TOKEN || '',
            },
          });
          break;
        default:
          console.warn('No email provider configured for production');
      }
    } else {
      // Development: Use console/file transport
      console.log('Email service running in development mode - emails will be logged to console and file');
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const baseUrl = process.env.APP_URL || 'http://localhost:5000';
    const verifyUrl = `${baseUrl}/verify?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email</h2>
        <p>Thank you for registering! Please click the link below to verify your email address:</p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Verify Email
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all;">${verifyUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify your email address',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const baseUrl = process.env.APP_URL || 'http://localhost:5000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your password. Click the link below to create a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset your password',
      html,
    });
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    if (this.isProduction && this.transporter) {
      // Production: Send via configured provider
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@construction-tracker.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      try {
        const info = await this.transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
      } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
      }
    } else {
      // Development: Log to console and file
      const emailLog = {
        timestamp: new Date().toISOString(),
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      // Log to console
      console.log('\n=== DEVELOPMENT EMAIL ===');
      console.log('To:', emailLog.to);
      console.log('Subject:', emailLog.subject);
      console.log('Content:', emailLog.html.replace(/<[^>]*>/g, '')); // Strip HTML for console
      console.log('========================\n');

      // Log to file
      try {
        const logEntry = JSON.stringify(emailLog, null, 2) + ',\n';
        await fs.appendFile(this.devLogPath, logEntry);
        console.log(`Email logged to ${this.devLogPath}`);
      } catch (error) {
        console.error('Error writing email to file:', error);
      }
    }
  }
}

export const emailService = new EmailService();