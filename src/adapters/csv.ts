import { parse } from "csv-parse/sync";
import { z } from "zod";
import type { DataIngestionAdapter, InvoiceRow, PatientRow } from "./interfaces";
import { dollarsToCents } from "@/lib/money";

// Column headers from a practice's export are often messy ("Patient ID",
// "patient_id", "Pt. Name"). Normalize to a canonical slug and accept aliases.
function slug(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const HEADER_ALIASES: Record<string, string[]> = {
  externalId: ["externalid", "patientid", "patientexternalid", "patient", "ptid", "mrn"],
  name: ["name", "fullname", "patientname", "ptname"],
  email: ["email", "emailaddress", "patientemail"],
  phone: ["phone", "phonenumber", "patientphone", "cell"],
  invoiceNumber: ["invoicenumber", "invoiceno", "number", "invoiceid", "invno"],
  description: ["description", "memo", "service", "servicedescription", "charge"],
  amount: ["amount", "total", "balance", "charged"],
  amountCents: ["amountcents", "totalcents", "balancecents"],
  issuedAt: ["issuedat", "issuedate", "date", "servicedate", "billedat", "billeddate"],
  dueAt: ["dueat", "duedate"],
};

const ALIAS_TO_CANONICAL: Record<string, string> = {};
for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
  for (const alias of aliases) ALIAS_TO_CANONICAL[alias] = canonical;
}

interface ParsedColumns {
  values: Record<string, string>;
  amountIsCents: boolean;
}

function readColumns(record: Record<string, string>): ParsedColumns {
  const values: Record<string, string> = {};
  let amountIsCents = false;
  for (const [key, value] of Object.entries(record)) {
    const canonical = ALIAS_TO_CANONICAL[slug(key)];
    if (!canonical) continue;
    if (!(canonical in values)) values[canonical] = value.trim();
    if (canonical === "amountCents") amountIsCents = true;
  }
  return { values, amountIsCents };
}

function parseDate(value: string | undefined, label: string): Date | undefined {
  if (!value || value.trim() === "") return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid ${label} date: "${value}"`);
  return d;
}

const patientSchema = z.object({
  externalId: z.string().min(1, "externalId is required"),
  name: z.string().min(1, "name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
});

export class CsvIngestionAdapter
  implements DataIngestionAdapter<{ patients: PatientRow[]; invoices: InvoiceRow[] }>
{
  /**
   * Accepts a combined CSV where patient and invoice columns may be present in
   * the same sheet (e.g. a weekly billing export), and splits the two concerns.
   */
  parse(input: string): { patients: PatientRow[]; invoices: InvoiceRow[] } {
    const records = parse(input, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
    }) as Record<string, string>[];

    if (records.length === 0) throw new Error("The CSV contains no data rows.");

    const patients = new Map<string, PatientRow>();
    const invoices: InvoiceRow[] = [];

    for (const [rowIndex, raw] of records.entries()) {
      const { values: c, amountIsCents } = readColumns(raw);
      const rowLabel = `row ${rowIndex + 2}`; // +2 to account for header in spreadsheet terms

      const hasInvoice = Boolean(c.invoiceNumber) || Boolean(c.amount) || Boolean(c.amountCents);
      const hasPatient = Boolean(c.externalId) || Boolean(c.name);

      if (hasPatient) {
        const externalId = c.externalId ?? c.name ?? "";
        const p = patientSchema.parse({
          externalId,
          name: c.name ?? externalId,
          email: c.email || undefined,
          phone: c.phone || undefined,
        });
        if (!patients.has(p.externalId)) patients.set(p.externalId, p);
      }

      if (hasInvoice) {
        if (!c.externalId) {
          throw new Error(`${rowLabel}: invoice "${c.invoiceNumber ?? "(unnamed)"}" has no patient reference column.`);
        }
        const rawAmount = c.amount ?? c.amountCents;
        if (rawAmount === undefined) {
          throw new Error(`${rowLabel}: invoice "${c.invoiceNumber}" is missing an amount.`);
        }
        const amountCents = amountIsCents ? Number(rawAmount) : dollarsToCents(rawAmount);
        if (!Number.isInteger(amountCents) || amountCents < 0) {
          throw new Error(`${rowLabel}: invoice "${c.invoiceNumber}" has an invalid amount "${rawAmount}".`);
        }
        invoices.push({
          patientExternalId: c.externalId,
          invoiceNumber: c.invoiceNumber ?? `INV-${Date.now()}-${rowIndex}`,
          description: c.description ?? "Medical services",
          amountCents,
          issuedAt: parseDate(c.issuedAt, "issued") ?? new Date(),
          dueAt: parseDate(c.dueAt, "due"),
        });
      }
    }

    if (patients.size === 0) {
      throw new Error("No patient rows found. Expected an 'externalId'/'name' column.");
    }

    return { patients: [...patients.values()], invoices };
  }
}
