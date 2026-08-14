import nodemailer from "nodemailer";
import { prisma } from "@/db/client";
import { config } from "./config";

export type EmailKind =
  | "MAGIC_LINK"
  | "PORTAL_LINK"
  | "RECEIPT"
  | "STATEMENT"
  | "REMINDER"
  | "BULK_STATEMENT"
  | "BULK_REMINDER";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface SendResult {
  /** true when delivered via SMTP; false in mock mode (caller surfaces a preview). */
  sent: boolean;
  preview?: { to: string; subject: string; html: string };
}

export function smtpConfigured(): boolean {
  return Boolean(config.smtpHost && config.smtpFrom);
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: config.smtpUser
        ? { user: config.smtpUser, pass: config.smtpPass }
        : undefined,
    });
  }
  return transporter;
}

/**
 * Send an email. In mock mode (no SMTP configured) nothing is sent; the
 * message is returned as a preview so the UI can show what *would* have gone
 * out — ideal for self-hosted clinics that haven't wired SMTP yet and for the
 * static demo.
 */
export async function sendMail(msg: EmailMessage): Promise<SendResult> {
  if (!smtpConfigured()) {
    console.log(`[mock mail] To: ${msg.to} — ${msg.subject}`);
    return { sent: false, preview: msg };
  }
  try {
    await getTransporter().sendMail({
      from: config.smtpFrom,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    });
    return { sent: true };
  } catch (err) {
    console.error("SMTP send failed:", err);
    // Never fail a request because mail failed; fall back to mock preview.
    return { sent: false, preview: msg };
  }
}

/**
 * Send an email to a patient AND write an EmailLog row so the billing team
 * can see every message that went out. Uses the same mock-mode behavior as
 * sendMail; the log records whether it was actually delivered.
 */
export async function sendPatientEmail(input: {
  patientId: string;
  kind: EmailKind;
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId },
    select: { organizationId: true },
  });
  const result = await sendMail({
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  if (patient) {
    await prisma.emailLog.create({
      data: {
        organizationId: patient.organizationId,
        patientId: input.patientId,
        kind: input.kind,
        to: input.to,
        subject: input.subject,
        status: result.sent ? "SENT" : "MOCKED",
      },
    }).catch((err) => {
      // A failed log write must never break the send path.
      console.error("EmailLog write failed:", err);
    });
  }
  return result;
}
