import nodemailer from "nodemailer";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    cid?: string;
    contentType?: string;
    contentDisposition?: "inline" | "attachment";
  }>;
};

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

export async function sendEmail(payload: EmailPayload): Promise<{ skipped: boolean }> {
  const transporter = getTransport();
  if (!transporter) {
    console.warn("SMTP is not configured. Skipping email send.");
    console.info("Email payload:", {
      to: payload.to,
      subject: payload.subject,
    });
    return { skipped: true };
  }

  const from = process.env.SMTP_FROM || "no-reply@example.com";
  await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    attachments: payload.attachments,
  });

  return { skipped: false };
}
