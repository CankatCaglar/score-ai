"use server";

import nodemailer from "nodemailer";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function joinWaitlist(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
    throw new Error("INVALID_EMAIL");
  }

  // Deterministic ID: aynı e-posta tekrar gelirse aynı doküman güncellenir.
  const waitlistId = Buffer.from(normalizedEmail).toString("base64url");
  const waitlistDocRef = doc(db, "waitlist", waitlistId);
  await setDoc(
    waitlistDocRef,
    {
      waitlistId,
      email: normalizedEmail,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // SMTP henüz tanımlı değilse client-side waitlist kaydı çalışmaya devam etsin.
  if (!smtpHost || !smtpUser || !smtpPass) {
    return {
      ok: true,
      waitlistId,
      recipient: normalizedEmail,
      accepted: [] as string[],
    };
  }

  const smtpPort = Number(process.env.SMTP_PORT ?? "465");
  const fromAddress = process.env.SMTP_FROM ?? smtpUser;
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const subject = "Score AI bekleme listesine hoş geldiniz";
  const textBody =
    "Merhaba,\n\nScore AI erken erişim listesine katıldığınız için teşekkür ederiz. Lansman detaylarını yakında sizinle paylaşacağız.\n\nScore AI\ninfo@usescore.net";

  const mailResult = await transporter.sendMail({
    from: {
      name: "Score AI",
      address: fromAddress,
    },
    to: normalizedEmail,
    replyTo: fromAddress,
    subject,
    text: textBody,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 24px;">
        <p style="font-size: 16px; margin: 0 0 16px;">Merhaba,</p>
        <p style="font-size: 16px; margin: 0 0 16px;">
          Score AI erken erişim listesine katıldığınız için teşekkür ederiz.
          Lansman detaylarını yakında sizinle paylaşacağız.
        </p>
        <p style="font-size: 14px; margin: 0; color: #4b5563;">Score AI · info@usescore.net</p>
      </div>
    `,
    headers: {
      "X-Entity-Ref-ID": waitlistId,
    },
  });

  if (mailResult.rejected?.length) {
    throw new Error(`MAIL_REJECTED:${mailResult.rejected.join(",")}`);
  }

  return {
    ok: true,
    waitlistId,
    recipient: normalizedEmail,
    accepted: mailResult.accepted,
  };
}
