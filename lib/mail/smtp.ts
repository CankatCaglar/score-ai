import nodemailer from "nodemailer";

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
};

export type SendMailResult =
  | { ok: true; skipped: true; reason: "SMTP_NOT_CONFIGURED" }
  | { ok: true; skipped: false; messageId?: string }
  | { ok: false; error: string };

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT ?? "465");
  const from = process.env.SMTP_FROM?.trim() || user;
  return { host, user, pass, port, from };
}

export function isSmtpConfigured(): boolean {
  return Boolean(getSmtpConfig());
}

export function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return "http://localhost:3000";
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const config = getSmtpConfig();
  if (!config) {
    return { ok: true, skipped: true, reason: "SMTP_NOT_CONFIGURED" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const result = await transporter.sendMail({
      from: {
        name: "Score AI",
        address: config.from,
      },
      to: input.to,
      replyTo: config.from,
      subject: input.subject,
      text: input.text,
      html: input.html,
      headers: input.headers,
    });

    if (result.rejected?.length) {
      return {
        ok: false,
        error: `MAIL_REJECTED:${result.rejected.join(",")}`,
      };
    }

    return {
      ok: true,
      skipped: false,
      messageId: typeof result.messageId === "string" ? result.messageId : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "MAIL_SEND_FAILED",
    };
  }
}

export function wrapEmailHtml(bodyHtml: string): string {
  return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 24px;">
        ${bodyHtml}
        <p style="font-size: 14px; margin: 24px 0 0; color: #4b5563;">Score AI · info@usescore.net</p>
      </div>
    `;
}
