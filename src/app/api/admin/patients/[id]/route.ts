import { NextResponse } from "next/server";
import { z } from "zod";
import { updatePatientContact } from "@/core/services";
import { isAdminRequestAuthorized } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1, "Name is required.").optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
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
    const patient = await updatePatientContact(id, parsed.data);
    return NextResponse.json({ patient });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update patient." },
      { status: 400 }
    );
  }
}
