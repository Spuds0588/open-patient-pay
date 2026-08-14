import nodemailer from "nodemailer";
import { config } from "./config";

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
