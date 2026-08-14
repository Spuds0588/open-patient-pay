import { NextResponse } from "next/server";
import { z } from "zod";
import { addPatientNote } from "@/core/services";
import { isAdminRequestAuthorized } from "@/lib/auth";

const schema = z.object({
  kind: z.enum(["NOTE", "CALL"]).default("NOTE"),
  body: z.string().min(1, "Add a note or call summary."),
  author: z.string().min(1).default("Billing team"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const note = await addPatientNote({
      patientId: id,
      kind: parsed.data.kind,
      body: parsed.data.body,
      author: parsed.data.author,
    });
    return NextResponse.json({ note });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save note." },
      { status: 400 }
    );
  }
}
