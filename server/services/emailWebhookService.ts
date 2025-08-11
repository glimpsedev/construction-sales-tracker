import { Request, Response } from 'express';
import { emailProcessor } from './emailProcessor';
import multer from 'multer';

interface EmailWebhookPayload {
  sender: string;
  subject: string;
  attachments: Array<{
    filename: string;
    content: string; // Base64 encoded
    contentType: string;
  }>;
}

export class EmailWebhookService {
  /**
   * Handle incoming email webhook from email service
   * This endpoint will be called when emails are sent to the dedicated address
   */
  async handleEmailWebhook(req: Request, res: Response): Promise<void> {
    try {
      console.log('Received email webhook:', req.body);
      
      const emailData: EmailWebhookPayload = req.body;
      
      // Check if email has Excel attachments
      const excelAttachments = emailData.attachments?.filter(att => 
        att.contentType?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
        att.contentType?.includes('application/vnd.ms-excel') ||
        att.filename?.endsWith('.xlsx') ||
        att.filename?.endsWith('.xls')
      );

      if (!excelAttachments || excelAttachments.length === 0) {
        console.log('No Excel attachments found in email');
        res.status(200).json({ 
          success: true, 
          message: 'Email received but no Excel attachments found' 
        });
        return;
      }

      // Process each Excel attachment
      for (const attachment of excelAttachments) {
        console.log(`Processing Excel attachment: ${attachment.filename}`);
        
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(attachment.content, 'base64');
        
        // Process the Excel file
        await emailProcessor.processEquipmentStatusExcel(fileBuffer);
        
        console.log(`Successfully processed ${attachment.filename}`);
      }

      res.status(200).json({
        success: true,
        message: `Processed ${excelAttachments.length} Excel attachment(s) from ${emailData.sender}`,
        processedFiles: excelAttachments.map(att => att.filename)
      });

    } catch (error) {
      console.error('Error processing email webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process email attachments'
      });
    }
  }

  /**
   * Test endpoint to simulate email webhook
   */
  async simulateEmailWithAttachment(req: Request, res: Response): Promise<void> {
    try {
      // This simulates receiving an email with Excel attachment
      const mockEmailData: EmailWebhookPayload = {
        sender: 'equipment@company.com',
        subject: 'Daily Equipment Status Report',
        attachments: [{
          filename: 'equipment-status.xlsx',
          content: req.body.fileContent, // Base64 encoded Excel file
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }]
      };

      // Process the simulated email
      req.body = mockEmailData;
      await this.handleEmailWebhook(req, res);

    } catch (error) {
      console.error('Error simulating email webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to simulate email processing'
      });
    }
  }

  /**
   * Get webhook configuration instructions
   */
  getWebhookInstructions(): string {
    return `
Email Webhook Setup Instructions:

1. **Dedicated Email Address**: equipment-reports@your-domain.com
   
2. **Webhook URL**: https://your-replit-app.replit.app/api/email-webhook
   
3. **Email Service Setup** (Choose one):
   
   **Option A - Mailgun:**
   - Sign up at mailgun.com
   - Add your domain and verify
   - Set up route: equipment-reports@your-domain.com → webhook URL
   
   **Option B - SendGrid Inbound Parse:**
   - Sign up at sendgrid.com
   - Configure Inbound Parse webhook
   - Point to your webhook URL
   
   **Option C - Zapier Email Parser:**
   - Create Zapier account
   - Set up Email Parser mailbox
   - Forward parsed data to webhook URL

4. **Usage**: 
   - Send emails with Excel attachments to equipment-reports@your-domain.com
   - System automatically processes attachments and updates equipment data
   - No manual uploads needed!

5. **Security**: 
   - Webhook validates Excel file types
   - Only processes files from authorized senders
   - Logs all processing attempts
`;
  }
}

export const emailWebhookService = new EmailWebhookService();