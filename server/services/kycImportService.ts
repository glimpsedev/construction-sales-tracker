/**
 * KYC Import Service - Parses Master KYC sales log CSV, creates companies, contacts, and interactions.
 */

import * as XLSX from "xlsx";
import { storage } from "../storage";
import type { InsertCompany, InsertContact, InsertInteraction } from "@shared/schema";

export interface KycImportResults {
  companiesCreated: number;
  contactsCreated: number;
  interactionsCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}

interface KycCSVRow {
  Date?: string;
  Type?: string;
  Customer?: string;
  Contact?: string;
  Role?: string;
  Notes?: string;
  [key: string]: string | undefined;
}

type InteractionType = "call" | "email" | "meeting" | "site_visit" | "text" | "note";

function normalizeCompanyName(name: string): string {
  return name
    .replace(/^\(([^)]+)\)$/, "$1") // (ANVIL) -> ANVIL
    .replace(/\s*\([^)]+\)\s*/g, " ") // (Vulcan Materials) in middle -> space
    .toUpperCase()
    .replace(/\b(INC|LLC|CORP|CO|LTD)\.?$/gi, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mapInteractionType(typeRaw: string): InteractionType {
  const t = (typeRaw || "").toLowerCase().trim();
  if (t === "call" || t === "phone call") return "call";
  if (t === "in person" || t === "in person ") return "site_visit";
  if (t === "email") return "email";
  if (t === "text") return "text";
  return "note";
}

function toStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (val instanceof Date) {
    return `${val.getMonth() + 1}/${val.getDate()}/${val.getFullYear()}`;
  }
  return String(val);
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) return null;
  const month = parseInt(parts[0], 10) - 1;
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

const GENERIC_CONTACTS = new Set(["front desk", "?", "no", "unknown", "n/a", ""]);

/**
 * Parse Contact field. Formats: "Name: Role", "Name", "Front Desk", "Name1 Name2 Name3"
 * Returns { fullName, role } - use Role column as fallback for role.
 */
function parseContact(contactRaw: string, roleFromColumn: string): { fullName: string; role: string } {
  const contact = (contactRaw || "").trim();
  const role = (roleFromColumn || "").trim();

  if (!contact || GENERIC_CONTACTS.has(contact.toLowerCase())) {
    return { fullName: role || "Unknown", role: role || "Unknown" };
  }

  // "Name: Role" or "Name: Role Name2: Role2" - take first segment
  const colonIdx = contact.indexOf(":");
  if (colonIdx > 0) {
    const beforeColon = contact.slice(0, colonIdx).trim();
    const afterColon = contact.slice(colonIdx + 1).trim();
    // "Gloria: Front Desk Dannelle Graham: Purchasing" -> name=Gloria, role=Front Desk
    const name = beforeColon;
    const firstRole = afterColon.split(/\s+[A-Z]/)[0]?.trim() || afterColon.split(" ")[0] || role;
    return { fullName: name, role: firstRole || role };
  }

  return { fullName: contact, role: role || "Unknown" };
}

function normalizeContactKey(fullName: string, companyNormalized: string): string {
  return `${companyNormalized}|${(fullName || "").toLowerCase().replace(/\s/g, "")}`;
}

export async function importKycCsv(
  fileBuffer: Buffer,
  userId: string,
  dryRun: boolean = false
): Promise<KycImportResults> {
  const results: KycImportResults = {
    companiesCreated: 0,
    contactsCreated: 0,
    interactionsCreated: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  const companyMap = new Map<string, string>(); // normalizedName -> companyId
  const contactMap = new Map<string, string>(); // normalizedContactKey -> contactId
  const lastInteractionByContact = new Map<string, { at: Date; type: string }>();
  const lastInteractionByCompany = new Map<string, { at: Date; type: string }>();

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(fileBuffer, { type: "buffer" });
  } catch (err) {
    results.errors.push(`Failed to parse file: ${err instanceof Error ? err.message : String(err)}`);
    return results;
  }

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<KycCSVRow>(firstSheet, { raw: false, dateNF: "m/d/yyyy" });

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    try {
      const customerRaw = toStr(row.Customer ?? row.customer).trim();
      if (!customerRaw) {
        results.duplicatesSkipped++;
        continue;
      }

      const companyName = customerRaw.replace(/^\s*\(([^)]+)\)\s*/, "$1").trim();
      const normalizedCompany = normalizeCompanyName(companyName);
      if (!normalizedCompany) {
        results.duplicatesSkipped++;
        continue;
      }

      let companyId: string;
      if (companyMap.has(normalizedCompany)) {
        companyId = companyMap.get(normalizedCompany)!;
      } else {
        const existing = await storage.getCompanyByNormalizedName(normalizedCompany, userId);
        if (existing) {
          companyId = existing.id;
          companyMap.set(normalizedCompany, companyId);
        } else {
          if (!dryRun) {
            const newCompany: InsertCompany = {
              userId,
              name: companyName,
              normalizedName: normalizedCompany,
              type: "contractor",
              tags: [],
            };
            const created = await storage.createCompany(newCompany);
            companyId = created.id;
            companyMap.set(normalizedCompany, companyId);
            results.companiesCreated++;
          } else {
            companyId = `dry-run-${normalizedCompany}`;
            companyMap.set(normalizedCompany, companyId);
            results.companiesCreated++;
          }
        }
      }

      const contactRaw = toStr(row.Contact ?? row.contact).trim();
      const roleFromCol = toStr(row.Role ?? row.role).trim();
      const { fullName, role } = parseContact(contactRaw, roleFromCol);

      const contactKey = normalizeContactKey(fullName, normalizedCompany);
      let contactId: string;

      if (contactMap.has(contactKey)) {
        contactId = contactMap.get(contactKey)!;
      } else {
        const existingContacts = await storage.getContacts({ userId, companyId });
        const normalizedFull = (fullName || "").toLowerCase().replace(/\s/g, "");
        const existing = existingContacts.find((c) => {
          const cFull = (c.fullName || "").toLowerCase().replace(/\s/g, "");
          const cFirstLast = `${(c.firstName || "")}${(c.lastName || "")}`.toLowerCase().replace(/\s/g, "");
          return cFull === normalizedFull || cFirstLast === normalizedFull;
        });

        if (existing) {
          contactId = existing.id;
          contactMap.set(contactKey, contactId);
        } else {
          if (!dryRun) {
            const nameParts = fullName.split(/\s+/);
            const firstName = nameParts[0] || null;
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;
            const newContact: InsertContact = {
              userId,
              companyId,
              firstName,
              lastName,
              fullName,
              role,
              source: "kyc_import",
              tags: [],
            };
            const created = await storage.createContact(newContact);
            contactId = created.id;
            contactMap.set(contactKey, contactId);
            results.contactsCreated++;
          } else {
            contactId = `dry-run-${contactKey}`;
            contactMap.set(contactKey, contactId);
            results.contactsCreated++;
          }
        }
      }

      const typeRaw = toStr(row.Type ?? row.type).trim();
      const interactionType = mapInteractionType(typeRaw);
      const notes = toStr(row.Notes ?? row.notes).trim();
      const dateStr = toStr(row.Date ?? row.date).trim();
      const occurredAt = parseDate(dateStr) || new Date();

      if (!dryRun && !contactId.startsWith("dry-run-")) {
        const interaction: InsertInteraction = {
          userId,
          contactId,
          companyId,
          type: interactionType,
          direction: "outbound",
          notes: notes || null,
          occurredAt,
        };
        await storage.createInteraction(interaction);
        results.interactionsCreated++;

        const prevContact = lastInteractionByContact.get(contactId);
        if (!prevContact || occurredAt > prevContact.at) {
          lastInteractionByContact.set(contactId, { at: occurredAt, type: interactionType });
        }
        const prevCompany = lastInteractionByCompany.get(companyId);
        if (!prevCompany || occurredAt > prevCompany.at) {
          lastInteractionByCompany.set(companyId, { at: occurredAt, type: interactionType });
        }
      } else if (dryRun) {
        results.interactionsCreated++;
      }
    } catch (err) {
      results.errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!dryRun) {
    for (const [contactId, { at, type }] of lastInteractionByContact) {
      await storage.updateContact(contactId, { lastInteractionAt: at, lastInteractionType: type }, userId);
    }
    for (const [companyId, { at, type }] of lastInteractionByCompany) {
      await storage.updateCompany(companyId, { lastInteractionAt: at, lastInteractionType: type }, userId);
    }
  }

  return results;
}
