import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";
import { issueMagicLink } from "@/core/services";
import { config } from "@/lib/config";
import { magicLinkEmail } from "@/lib/emails";
import { sendPatientEmail } from "@/lib/mailer";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const patient = await prisma.patient.findFirst({
      where: { email: { equals: parsed.data.email, mode: "insensitive" } },
    });

    // Don't leak whether an email is on file.
    if (!patient) {
      return NextResponse.json({ ok: true, emailed: false });
    }

    const { url, expiresAt } = await issueMagicLink(patient.id, config.baseUrl);
    const result = await sendPatientEmail({
      patientId: patient.id,
      kind: "MAGIC_LINK",
      to: patient.email!,
      subject: "Your secure payment portal link",
      html: magicLinkEmail({ name: patient.name, url }),
    });

    return NextResponse.json({
      ok: true,
      emailed: result.sent,
      // In mock mode (no SMTP) expose the link so local/demo flows still work.
      url: result.sent ? undefined : url,
      expiresAt,
      ttlMinutes: config.magicLinkTtlMinutes,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send a portal link." },
      { status: 400 }
    );
  }
}
