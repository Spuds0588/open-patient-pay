import { NextResponse } from "next/server";
import { prisma } from "@/db/client";
import { issueMagicLink } from "@/core/services";
import { config } from "@/lib/config";
import { magicLinkEmail } from "@/lib/emails";
import { sendMail } from "@/lib/mailer";
import { isAdminRequestAuthorized } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequestAuthorized(_request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const { id } = await params;
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    if (!patient.email) {
      return NextResponse.json(
        { error: "Patient has no email on file — add one first." },
        { status: 400 }
      );
    }

    const { url } = await issueMagicLink(id, config.baseUrl);
    const result = await sendMail({
      to: patient.email,
      subject: "Your secure payment portal link",
      html: magicLinkEmail({ name: patient.name, url }),
    });

    return NextResponse.json({ ok: true, sent: result.sent, url: result.sent ? undefined : url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send link." },
      { status: 400 }
    );
  }
}
