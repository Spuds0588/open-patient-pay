import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";

const schema = z.object({
  patientToken: z.string().min(1),
  remindersEnabled: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const patient = await prisma.patient.findUnique({
      where: { payToken: parsed.data.patientToken },
    });
    if (!patient) return NextResponse.json({ error: "Portal link is invalid." }, { status: 404 });

    await prisma.patient.update({
      where: { id: patient.id },
      data: { remindersEnabled: parsed.data.remindersEnabled },
    });
    return NextResponse.json({ ok: true, remindersEnabled: parsed.data.remindersEnabled });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update preferences." },
      { status: 400 }
    );
  }
}
