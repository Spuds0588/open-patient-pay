import { describe, expect, it } from "vitest";
import { CsvIngestionAdapter } from "./csv";
import { SAMPLE_CSV } from "@/lib/sample-csv";

const adapter = new CsvIngestionAdapter();

describe("CsvIngestionAdapter", () => {
  it("parses the bundled sample export", () => {
    const { patients, invoices } = adapter.parse(SAMPLE_CSV);
    expect(patients).toHaveLength(5);
    expect(invoices).toHaveLength(5);
    expect(invoices[0]).toMatchObject({
      patientExternalId: "MRN-1001",
      invoiceNumber: "INV-1001",
      amountCents: 124000,
    });
  });

  it("tolerates messy headers and quoted fields", () => {
    const csv = `"Patient ID","Full Name","Invoice No","Service Description","Total","Issue Date"
"P-1","Jane Doe","A-1","Consult, follow-up","150.50","2026-01-01"`;
    const { patients, invoices } = adapter.parse(csv);
    expect(patients[0]).toMatchObject({ externalId: "P-1", name: "Jane Doe" });
    expect(invoices[0].amountCents).toBe(15050);
    expect(invoices[0].description).toBe("Consult, follow-up");
  });

  it("supports a cents column", () => {
    const csv = `externalId,name,invoiceNumber,description,amountCents
P-1,Jane Doe,A-1,Visit,15050`;
    const { invoices } = adapter.parse(csv);
    expect(invoices[0].amountCents).toBe(15050);
  });

  it("dedupes patients by externalId", () => {
    const csv = `externalId,name,invoiceNumber,description,amount
P-1,Jane Doe,A-1,Visit 1,10
P-1,Jane Doe,A-2,Visit 2,20`;
    const { patients, invoices } = adapter.parse(csv);
    expect(patients).toHaveLength(1);
    expect(invoices).toHaveLength(2);
  });

  it("throws when an invoice lacks a patient reference", () => {
    const csv = `invoiceNumber,description,amount
A-1,Visit,10`;
    expect(() => adapter.parse(csv)).toThrow(/patient reference/i);
  });
});
