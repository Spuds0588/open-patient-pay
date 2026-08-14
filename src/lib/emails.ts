import { config } from "./config";
import { formatCents } from "./money";
import { formatDate } from "./utils";

function layout(subject: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f1f5f9;color:#0f172a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:18px 24px;background:#2563eb;color:#ffffff;font-weight:700;font-size:16px;">${config.appName}</td></tr>
    <tr><td style="padding:24px;">
      <h2 style="margin:0 0 12px;font-size:18px;">${subject}</h2>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:14px 24px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;">
      Open Patient Pay · open-source, self-hosted medical billing
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

export function magicLinkEmail(params: { name: string; url: string }): string {
  return layout(
    "Your secure payment portal link",
    `<p>Hi ${params.name},</p>
     <p>Click the button below to open your secure payment portal. This link expires in ${config.magicLinkTtlMinutes} minutes and works only once.</p>
     <p style="margin:22px 0;"><a href="${params.url}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Open my portal</a></p>
     <p style="color:#64748b;font-size:13px;">If the button doesn't work, paste this into your browser:<br/><a href="${params.url}" style="word-break:break-all;">${params.url}</a></p>`
  );
}

export function receiptEmail(params: {
  patientName: string;
  invoiceNumber: string;
  description: string;
  amountCents: number;
  paidAt: Date;
}): string {
  return layout(
    `Payment receipt — ${formatCents(params.amountCents)}`,
    `<p>Hi ${params.patientName},</p>
     <p>Thank you! Your payment has been received and applied to your account.</p>
     <table role="presentation" width="100%" cellpadding="6" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;margin:16px 0;">
       <tr><td style="color:#64748b;">Invoice</td><td style="text-align:right;font-weight:600;">${params.invoiceNumber}</td></tr>
       <tr><td style="color:#64748b;">Description</td><td style="text-align:right;">${params.description}</td></tr>
       <tr><td style="color:#64748b;">Amount</td><td style="text-align:right;font-weight:600;">${formatCents(params.amountCents)}</td></tr>
       <tr><td style="color:#64748b;">Date</td><td style="text-align:right;">${formatDate(params.paidAt)}</td></tr>
     </table>
     <p style="color:#64748b;font-size:13px;">Questions? Contact the billing team at ${config.billingEmail}${config.billingPhone ? ` or ${config.billingPhone}` : ""}.</p>`
  );
}

export function statementEmail(params: {
  patientName: string;
  portalUrl: string;
  bodyRows: string;
  totalOutstandingCents: number;
}): string {
  return layout(
    `Your statement — ${formatCents(params.totalOutstandingCents)} outstanding`,
    `<p>Hi ${params.patientName},</p>
     <p>Here is a summary of your account. You can view a full, printable statement in your portal.</p>
     <table role="presentation" width="100%" cellpadding="6" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;margin:16px 0;">
       <tr><th style="text-align:left;color:#64748b;border-bottom:1px solid #e2e8f0;">Invoice</th><th style="text-align:right;color:#64748b;border-bottom:1px solid #e2e8f0;">Balance</th></tr>
       ${params.bodyRows}
     </table>
     <p style="margin:18px 0;"><a href="${params.portalUrl}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">View full statement</a></p>`
  );
}

export function reminderEmail(params: {
  patientName: string;
  installmentNumber: number;
  amountCents: number;
  dueDate: Date;
  portalUrl: string;
}): string {
  return layout(
    `Payment reminder — ${formatCents(params.amountCents)} due ${formatDate(params.dueDate)}`,
    `<p>Hi ${params.patientName},</p>
     <p>This is a friendly reminder that payment ${params.installmentNumber} of <strong>${formatCents(params.amountCents)}</strong> is due on <strong>${formatDate(params.dueDate)}</strong>.</p>
     <p style="margin:22px 0;"><a href="${params.portalUrl}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Pay now</a></p>
     <p style="color:#64748b;font-size:13px;">No convenience fees, ever. Need help? Contact ${config.billingEmail}.</p>`
  );
}

/** Build the per-invoice rows used by the statement email. */
export function statementBodyRows(
  invoices: Array<{ invoiceNumber: string; description: string; outstandingCents: number }>
): string {
  if (invoices.length === 0) {
    return `<tr><td colspan="2" style="color:#64748b;">No open invoices.</td></tr>`;
  }
  return invoices
    .map(
      (i) =>
        `<tr><td>${i.invoiceNumber} — ${i.description}</td><td style="text-align:right;font-weight:600;">${formatCents(i.outstandingCents)}</td></tr>`
    )
    .join("");
}
