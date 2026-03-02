/**
 * VCF Import Service - Parses VCF files, normalizes data, deduplicates, and imports contacts/companies.
 */

import { parsePhoneNumber } from "libphonenumber-js";
import { storage } from "../storage";
import type { InsertCompany, InsertContact } from "@shared/schema";

export interface VcfImportResults {
  imported: number;
  companiesCreated: number;
  contactsCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}

interface ParsedVcard {
  n?: string;
  fn?: string;
  org?: string;
  title?: string;
  tels: { value: string; type: string }[];
  emails: { value: string; type: string }[];
  adrs: { value: string; type: string }[];
  url?: string;
  note?: string;
  categories?: string;
}

function parseVcf(buffer: Buffer): ParsedVcard[] {
  const text = buffer.toString("utf-8");
  const cards: ParsedVcard[] = [];
  const blocks = text.split(/(?=BEGIN:VCARD)/i).filter((b) => b.trim());

  for (const block of blocks) {
    if (!block.includes("END:VCARD")) continue;

    const card: ParsedVcard = { tels: [], emails: [], adrs: [] };
    let folded = block.replace(/\r\n /g, "").replace(/\n /g, "");

    const lines = folded.split(/\r?\n/);
    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx < 0) continue;

      const left = line.slice(0, colonIdx);
      const value = line.slice(colonIdx + 1).trim();

      const semicolonIdx = left.indexOf(";");
      const name = semicolonIdx >= 0 ? left.slice(0, semicolonIdx).replace(/^item\d+\./, "") : left.replace(/^item\d+\./, "");
      const nameBase = name.split(";")[0];

      if (nameBase === "N") card.n = value;
      else if (nameBase === "FN") card.fn = value;
      else if (nameBase === "ORG") card.org = value;
      else if (nameBase === "TITLE") card.title = value;
      else if (nameBase === "TEL") card.tels.push({ value, type: left });
      else if (nameBase === "EMAIL") card.emails.push({ value, type: left });
      else if (nameBase === "ADR") card.adrs.push({ value, type: left });
      else if (nameBase === "URL") card.url = value;
      else if (nameBase === "NOTE") card.note = value;
      else if (nameBase === "CATEGORIES") card.categories = value;
    }

    if (card.n || card.fn || card.tels.length > 0 || card.emails.length > 0) {
      cards.push(card);
    }
  }

  return cards;
}

function extractCompanyFromName(n?: string): string | null {
  if (!n) return null;
  const match = n.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : null;
}

function extractNameParts(n?: string, fn?: string): { firstName: string; lastName: string; fullName: string } {
  let firstName = "";
  let lastName = "";
  let fullName = fn || "";

  if (n) {
    const parts = n.split(";").map((p) => p.replace(/\([^)]+\)/g, "").trim());
    if (parts.length >= 2) {
      lastName = parts[0] || "";
      firstName = parts[1] || "";
    } else if (parts.length === 1 && parts[0]) {
      firstName = parts[0];
    }
  }

  if (!fullName && (firstName || lastName)) {
    fullName = [firstName, lastName].filter(Boolean).join(" ");
  }

  return { firstName, lastName, fullName };
}

function normalizePhone(raw: string): string | null {
  if (!raw || raw.replace(/\D/g, "").length < 10) return null;
  try {
    const parsed = parsePhoneNumber(raw, "US");
    return parsed?.format("E.164") || null;
  } catch {
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 10) {
      const num = digits.length === 10 ? `+1${digits}` : digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
      return num;
    }
    return null;
  }
}

function normalizeCompanyName(name: string): string {
  return name
    .toUpperCase()
    .replace(/\b(INC|LLC|CORP|CO|LTD)\.?$/gi, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const ADR_GARBAGE = /(license|cslb|#\d+|°|'\*|grading|paving|state)/i;

function parseAdr(adr: string): { street?: string; city?: string; state?: string; zip?: string } | null {
  if (ADR_GARBAGE.test(adr)) return null;
  const parts = adr.split(";").map((p) => p.trim());
  if (parts.length < 6) return null;
  const street = parts[2] || undefined;
  const city = parts[3] || undefined;
  const state = parts[4] || undefined;
  const zip = parts[5] || undefined;
  if (!city && !state && !zip) return null;
  return { street, city, state, zip };
}

function getBestAdr(adrs: { value: string; type: string }[]): { street?: string; city?: string; state?: string; zip?: string } | null {
  for (const a of adrs) {
    const parsed = parseAdr(a.value);
    if (parsed) return parsed;
  }
  return null;
}

export default {
  async importVcf(buffer: Buffer, userId: string): Promise<VcfImportResults> {
    const results: VcfImportResults = {
      imported: 0,
      companiesCreated: 0,
      contactsCreated: 0,
      duplicatesSkipped: 0,
      errors: [],
    };

    const cards = parseVcf(buffer);
    const seenKeys = new Set<string>();
    const companyMap = new Map<string, string>(); // normalizedName -> companyId

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      try {
        const companyFromName = extractCompanyFromName(card.n);
        const orgName = (card.org || companyFromName || "").split(";")[0].trim();
        const companyName = orgName || companyFromName || "Unknown";

        const { firstName, lastName, fullName } = extractNameParts(card.n, card.fn);
        if (!fullName && !firstName && !lastName && card.tels.length === 0 && card.emails.length === 0) {
          results.duplicatesSkipped++;
          continue;
        }

        const displayName = fullName || [firstName, lastName].filter(Boolean).join(" ") || "Unknown";

        const phones = card.tels.map((t) => normalizePhone(t.value)).filter(Boolean) as string[];
        const primaryPhone = phones[0] || null;
        const cellPhone = phones.find((_, idx) => card.tels[idx]?.type?.toLowerCase().includes("cell")) || phones[1] || null;
        const workPhone = phones.find((_, idx) => card.tels[idx]?.type?.toLowerCase().includes("work")) || null;
        const faxPhone = phones.find((_, idx) => card.tels[idx]?.type?.toLowerCase().includes("fax")) || null;

        const emails = card.emails.map((e) => e.value.trim()).filter((e) => e && e.includes("@"));
        const primaryEmail = emails[0] || null;
        const secondaryEmail = emails[1] || null;

        const normalizedCompany = normalizeCompanyName(companyName);
        const dedupeKey = `${(firstName + lastName).toLowerCase().replace(/\s/g, "")}|${normalizedCompany}|${primaryPhone || primaryEmail || ""}`;

        if (seenKeys.has(dedupeKey)) {
          results.duplicatesSkipped++;
          continue;
        }
        seenKeys.add(dedupeKey);

        let companyId: string | null = null;
        if (normalizedCompany && normalizedCompany !== "UNKNOWN") {
          if (companyMap.has(normalizedCompany)) {
            companyId = companyMap.get(normalizedCompany)!;
          } else {
            const existing = await storage.getCompanies(userId);
            const existingCompany = existing.find(
              (c) => c.normalizedName && c.normalizedName.toUpperCase() === normalizedCompany
            );
            if (existingCompany) {
              companyId = existingCompany.id;
              companyMap.set(normalizedCompany, companyId);
            } else {
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
            }
          }
        }

        const adr = getBestAdr(card.adrs);

        const newContact: InsertContact = {
          userId,
          companyId,
          firstName: firstName || null,
          lastName: lastName || null,
          fullName: displayName,
          title: card.title || null,
          phonePrimary: primaryPhone,
          phoneCell: cellPhone || null,
          phoneWork: workPhone || null,
          phoneFax: faxPhone || null,
          emailPrimary: primaryEmail,
          emailSecondary: secondaryEmail || null,
          address: adr?.street || null,
          city: adr?.city || null,
          state: adr?.state || null,
          zip: adr?.zip || null,
          tags: card.categories ? card.categories.split(",").map((t) => t.trim()) : [],
          source: "vcf_import",
          notes: card.note || null,
        };

        await storage.createContact(newContact);
        results.contactsCreated++;
        results.imported++;
      } catch (err) {
        results.errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return results;
  },
};
