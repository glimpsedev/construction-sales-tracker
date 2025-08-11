import { db } from "../db";
import { rentalEquipment } from "@shared/schema";
import * as XLSX from "xlsx";
import { eq } from "drizzle-orm";

interface EquipmentRow {
  model: string;
  customer: string;
  customerOnRent: string;
  acctMgr: string;
  dateOnOffRent: string;
}

export class EmailProcessor {
  
  /**
   * Process Excel file from daily equipment status email
   * Implements the Excel script logic provided by user
   */
  async processEquipmentStatusExcel(fileBuffer: Buffer): Promise<void> {
    try {
      // Read Excel file
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Convert to JSON, mimicking the Excel script transformation
      const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
      
      // Apply transformations based on the Excel script:
      // 1. Remove first 7 rows (delete range 1:7)
      const dataAfterRowDeletion = data.slice(7);
      
      // 2. Process columns (delete ranges A:A, C:H, E:F, F:DI equivalent)
      // This leaves us with MODEL, CUSTOMER ON RENT, ACCT MGR, DATE ON/OFF RENT
      const processedData = dataAfterRowDeletion.map(row => {
        if (!row || row.length < 4) return null;
        return {
          model: row[1] || '', // Column B (MODEL after deleting A)
          customer: row[0] || '', // Original customer column
          customerOnRent: row[2] || '', // CUSTOMER ON RENT
          acctMgr: row[3] || '', // ACCT MGR 
          dateOnOffRent: row[4] || '' // DATE ON/OFF RENT
        };
      }).filter(row => row && row.model && row.customerOnRent);

      // 3. Filter for Hudson account manager (like the Excel script filter)
      const hudsonEquipment = processedData.filter(row => 
        row?.acctMgr?.toString().toLowerCase().includes('hudson')
      );

      // Clear existing equipment data for fresh import
      await db.delete(rentalEquipment);

      // Insert new equipment data
      for (const item of hudsonEquipment) {
        if (!item) continue;
        
        await db.insert(rentalEquipment).values({
          model: item.model,
          customer: item.customer,
          customerOnRent: item.customerOnRent,
          acctMgr: item.acctMgr,
          dateOnOffRent: item.dateOnOffRent,
          status: 'on_rent', // Default status
          notes: `Processed from email on ${new Date().toISOString().split('T')[0]}`
        });
      }

      console.log(`Processed ${hudsonEquipment.length} equipment records from email`);
      
    } catch (error) {
      console.error('Error processing equipment status email:', error);
      throw error;
    }
  }

  /**
   * Simulate email webhook trigger
   * In production, this would be called by email service webhook
   */
  async simulateEmailReceived(attachmentData: Buffer): Promise<void> {
    console.log('Processing daily equipment status email...');
    await this.processEquipmentStatusExcel(attachmentData);
  }

  /**
   * Get current equipment rental status
   */
  async getCurrentRentalStatus() {
    return await db.select().from(rentalEquipment).orderBy(rentalEquipment.lastUpdated);
  }
}

export const emailProcessor = new EmailProcessor();