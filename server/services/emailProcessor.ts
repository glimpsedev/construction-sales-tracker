import { db } from "../db";
import { rentalEquipment } from "@shared/schema";
import * as XLSX from "xlsx";

const SECTION_KEYWORDS = [
  "OFF RENT", "ON RENT", "DOWN", "READY", "NEEDS", "WELD SHOP",
  "RPO", "RE-RENTS", "JOBSITE ON HOLD", "ATTACHMENTS", "DO NOT RENT",
  "MISSING", "EXCAVATOR", "LOADER", "HAMMERS", "VIBRAPLATES",
  "TAILGATES", "SLOPE BOARDS", "WINCHES", "TRIMBLE", "MISC",
];

function isHeaderRow(row: any[]): boolean {
  const str = row.map(c => String(c ?? "").trim().toUpperCase()).join(" ");
  return str.includes("EQ #") && str.includes("MODEL");
}

function isSectionHeader(row: any[]): boolean {
  const first = String(row[0] ?? "").trim().toUpperCase();
  if (!first) return false;
  return SECTION_KEYWORDS.some(kw => first.includes(kw));
}

function isEquipmentRow(row: any[]): boolean {
  const eqNum = String(row[1] ?? "").trim();
  const model = String(row[2] ?? "").trim();
  return eqNum.length > 0 && model.length > 0 && /^[A-Z]{2}-/.test(eqNum);
}

function excelDateToString(serial: any): string {
  if (!serial) return "";
  const num = Number(serial);
  if (isNaN(num) || num < 1000) return String(serial);
  const utcDays = Math.floor(num - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  return date.toISOString().split("T")[0];
}

function cleanStr(val: any): string {
  return String(val ?? "").trim();
}

export class EmailProcessor {

  async processEquipmentStatusExcel(fileBuffer: Buffer): Promise<number> {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      if (rows[i] && isHeaderRow(rows[i])) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) {
      throw new Error("Could not find header row (EQ # / MODEL) in spreadsheet");
    }

    const equipmentRows: Array<{
      equipmentNumber: string;
      model: string;
      serialNumber: string;
      year: string;
      specs: string;
      customerOnRent: string;
      acctMgr: string;
      location: string;
      statusText: string;
      dateOnOffRent: string;
      daysOnOffRent: number | null;
      monthlyRate: number | null;
    }> = [];

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 10) continue;
      if (isSectionHeader(row)) continue;
      if (!isEquipmentRow(row)) continue;

      const acctMgr = cleanStr(row[11]);
      const statusText = cleanStr(row[13]);

      if (!acctMgr.toLowerCase().includes("hudson")) continue;
      if (!statusText.toUpperCase().includes("ON-RENT")) continue;

      const specsMain = cleanStr(row[7]);
      const specsAdd = cleanStr(row[8]);
      const specs = [specsMain, specsAdd].filter(Boolean).join(", ");

      const daysRaw = row[15];
      const daysOnOff = daysRaw != null && !isNaN(Number(daysRaw)) ? Number(daysRaw) : null;

      const rateRaw = row[17];
      const monthlyRate = rateRaw != null && !isNaN(Number(rateRaw)) && Number(rateRaw) > 0
        ? Number(rateRaw)
        : null;

      equipmentRows.push({
        equipmentNumber: cleanStr(row[1]),
        model: cleanStr(row[2]),
        serialNumber: cleanStr(row[3]),
        year: cleanStr(row[5]),
        specs,
        customerOnRent: cleanStr(row[10]),
        acctMgr,
        location: cleanStr(row[12]),
        statusText,
        dateOnOffRent: excelDateToString(row[14]),
        daysOnOffRent: daysOnOff,
        monthlyRate,
      });
    }

    await db.delete(rentalEquipment);

    for (const item of equipmentRows) {
      await db.insert(rentalEquipment).values({
        equipmentNumber: item.equipmentNumber,
        model: item.model,
        serialNumber: item.serialNumber || null,
        year: item.year || null,
        specs: item.specs || null,
        customer: item.customerOnRent,
        customerOnRent: item.customerOnRent,
        acctMgr: item.acctMgr,
        location: item.location || null,
        dateOnOffRent: item.dateOnOffRent || null,
        daysOnOffRent: item.daysOnOffRent,
        monthlyRate: item.monthlyRate,
        status: "on_rent",
        notes: null,
      });
    }

    console.log(`Processed ${equipmentRows.length} Hudson on-rent equipment records`);
    return equipmentRows.length;
  }

  async simulateEmailReceived(attachmentData: Buffer): Promise<void> {
    await this.processEquipmentStatusExcel(attachmentData);
  }

  async getCurrentRentalStatus() {
    return await db.select().from(rentalEquipment).orderBy(rentalEquipment.customerOnRent);
  }
}

export const emailProcessor = new EmailProcessor();
