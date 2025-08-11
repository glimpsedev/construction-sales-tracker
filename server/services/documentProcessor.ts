import { type InsertDocument, type InsertJob, type InsertEquipment } from '@shared/schema';
import { storage } from '../storage';
import { geocodeAddress } from './geocodingService';

interface ExtractedData {
  addresses: string[];
  equipment: {
    equipmentNumber?: string;
    attachmentType?: string;
    attachmentNumber?: string;
    status?: 'starting' | 'stopping';
    instructions?: string;
  }[];
  contractors?: string[];
  projectValues?: string[];
  dates?: string[];
}

export class DocumentProcessor {
  
  async processDocument(file: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: string;
    buffer: Buffer;
  }): Promise<ExtractedData> {
    
    try {
      let extractedText = '';
      
      // Extract text based on file type
      if (file.mimeType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
          file.mimeType.includes('application/msword')) {
        // For Word documents, you would use mammoth.js in a real implementation
        // This is a simplified version that extracts basic information
        extractedText = await this.extractTextFromWord(file.buffer);
      } else if (file.mimeType.includes('text/plain')) {
        extractedText = file.buffer.toString('utf-8');
      } else {
        throw new Error(`Unsupported file type: ${file.mimeType}`);
      }
      
      // Extract structured data from text
      const extractedData = await this.extractDataFromText(extractedText);
      
      // Save document record
      const documentRecord: InsertDocument = {
        filename: file.filename,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        extractedData: extractedData as any
      };
      
      await storage.createDocument(documentRecord);
      
      // Process extracted data to create jobs/equipment
      await this.processExtractedData(extractedData);
      
      return extractedData;
      
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  private async extractTextFromWord(buffer: Buffer): Promise<string> {
    // In a real implementation, you would use mammoth.js:
    // const mammoth = require('mammoth');
    // const result = await mammoth.extractRawText({ buffer });
    // return result.value;
    
    // For now, return a placeholder that would be replaced with actual mammoth implementation
    const mockText = buffer.toString('utf-8').substring(0, 1000);
    return mockText || 'Document content would be extracted here using mammoth.js';
  }

  private async extractDataFromText(text: string): Promise<ExtractedData> {
    const extractedData: ExtractedData = {
      addresses: [],
      equipment: [],
      contractors: [],
      projectValues: [],
      dates: []
    };

    // Extract addresses - look for common address patterns
    const addressRegex = /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Court|Ct|Circle|Cir|Plaza|Pl)\b[^\n,]*(?:,\s*[A-Za-z\s]+,?\s*\d{5})?/gi;
    const addresses = text.match(addressRegex) || [];
    extractedData.addresses = [...new Set(addresses.map(addr => addr.trim()))];

    // Extract equipment information
    const equipmentRegex = /(?:Equipment|Equip)[\s#:]*([A-Z]{1,3}[-]?\d+)/gi;
    const equipmentMatches = text.match(equipmentRegex) || [];
    
    // Extract attachment information
    const attachmentRegex = /(?:Attachment|Attach)[\s#:]*(\d+)/gi;
    const attachmentMatches = text.match(attachmentRegex) || [];
    
    // Extract equipment status (starting/stopping)
    const statusRegex = /(starting|stopping|drop\s+off|pick\s+up|delivery|removal)/gi;
    const statusMatches = text.match(statusRegex) || [];
    
    // Combine equipment information
    equipmentMatches.forEach((match, index) => {
      const equipmentNumber = match.replace(/(?:Equipment|Equip)[\s#:]*/gi, '').trim();
      const attachmentNumber = attachmentMatches[index]?.replace(/(?:Attachment|Attach)[\s#:]*/gi, '').trim();
      const status = statusMatches[index]?.toLowerCase().includes('stop') || 
                   statusMatches[index]?.toLowerCase().includes('pick') || 
                   statusMatches[index]?.toLowerCase().includes('removal') ? 'stopping' : 'starting';
      
      extractedData.equipment.push({
        equipmentNumber,
        attachmentNumber,
        status,
        instructions: `Extracted from document: ${match}`
      });
    });

    // Extract contractor names
    const contractorRegex = /(?:General Contractor|Contractor|GC)[\s:]*([A-Za-z\s&.,Inc]+)/gi;
    const contractors = text.match(contractorRegex) || [];
    extractedData.contractors = contractors.map(c => c.replace(/(?:General Contractor|Contractor|GC)[\s:]*/gi, '').trim());

    // Extract project values
    const valueRegex = /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|M|thousand|K))?/gi;
    extractedData.projectValues = text.match(valueRegex) || [];

    // Extract dates
    const dateRegex = /\b(?:\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/gi;
    extractedData.dates = text.match(dateRegex) || [];

    return extractedData;
  }

  private async processExtractedData(data: ExtractedData): Promise<void> {
    // Process addresses to create job sites
    for (const address of data.addresses) {
      try {
        const coordinates = await geocodeAddress(address);
        
        const job: InsertJob = {
          name: `Equipment Job - ${address.split(',')[0]}`,
          address,
          latitude: coordinates?.lat.toString(),
          longitude: coordinates?.lng.toString(),
          contractor: data.contractors?.[0],
          projectValue: data.projectValues?.[0]?.replace(/[^\d.,]/g, ''),
          status: 'active',
          type: 'equipment',
          isCustom: false,
          notes: 'Created from document processing'
        };
        
        const createdJob = await storage.createJob(job);
        
        // Create equipment records for this job
        for (const equipment of data.equipment) {
          const equipmentRecord: InsertEquipment = {
            jobId: createdJob.id,
            equipmentNumber: equipment.equipmentNumber || 'Unknown',
            attachmentType: equipment.attachmentType,
            attachmentNumber: equipment.attachmentNumber,
            status: equipment.status || 'starting',
            instructions: equipment.instructions
          };
          
          await storage.createEquipment(equipmentRecord);
        }
        
      } catch (error) {
        console.error(`Error creating job from address ${address}:`, error);
      }
    }
  }

  async processEmailAttachment(emailData: {
    from: string;
    subject: string;
    body: string;
    attachments: Array<{
      filename: string;
      mimeType: string;
      content: Buffer;
    }>;
  }): Promise<void> {
    
    try {
      // Process each attachment
      for (const attachment of emailData.attachments) {
        if (attachment.mimeType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
            attachment.mimeType.includes('application/msword')) {
          
          await this.processDocument({
            filename: `email-${Date.now()}-${attachment.filename}`,
            originalName: attachment.filename,
            mimeType: attachment.mimeType,
            size: attachment.content.length.toString(),
            buffer: attachment.content
          });
        }
      }
      
      // Also process email body for addresses/equipment info
      if (emailData.body) {
        const extractedData = await this.extractDataFromText(emailData.body);
        await this.processExtractedData(extractedData);
      }
      
    } catch (error) {
      console.error('Error processing email attachment:', error);
      throw error;
    }
  }
}

export const documentProcessor = new DocumentProcessor();
