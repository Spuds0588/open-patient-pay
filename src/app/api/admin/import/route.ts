import { NextResponse } from "next/server";
import { z } from "zod";
import { CsvIngestionAdapter } from "@/adapters";
import { getOrCreateOrganization, importRows } from "@/core/services";
import { isAdminRequestAuthorized } from "@/lib/auth";

const schema = z.object({
  csv: z.string().min(1, "CSV content is required."),
});

export async function POST(request: Request) {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const adapter = new CsvIngestionAdapter();
    const { patients, invoices } = adapter.parse(parsed.data.csv);
    const org = await getOrCreateOrganization();
    const summary = await importRows(org.id, patients, invoices);

    return NextResponse.json({ summary, patients: patients.length, invoices: invoices.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed." },
      { status: 400 }
    );
  }
}
