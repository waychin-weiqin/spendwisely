import nodemailer from "nodemailer";
import { Resend } from "resend";

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
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM;

  // Try Resend API first if configured
  if (resendKey && resendFrom) {
    try {
      const resend = new Resend(resendKey);
      const response = await resend.emails.send({
        to: payload.to,
        from: resendFrom,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        attachments: payload.attachments?.map((attachment) => ({
          content: attachment.content,
          filename: attachment.filename,
        })),
      });

      // Log full response for debugging
      console.log("Resend API full response:", JSON.stringify(response, null, 2));

      if (response.error) {
        console.error("Resend API error:", response.error);
        console.warn("Resend failed, attempting to fall back to SMTP...");
      } else if (response.data?.id) {
        console.info("Resend API sent email successfully", {
          messageId: response.data.id,
          to: payload.to,
          subject: payload.subject,
        });
        return { skipped: false };
      } else {
        console.warn("Resend returned success but no message ID, falling back to SMTP...");
      }
    } catch (error) {
      console.error("Resend API exception:", error);
      console.warn("Resend failed, attempting to fall back to SMTP...");
    }
  }

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
  const info = await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    attachments: payload.attachments,
  });

  console.info("SMTP sent email successfully", {
    messageId: info.messageId,
    to: payload.to,
    subject: payload.subject,
  });

  return { skipped: false };
}
