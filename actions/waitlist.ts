"use server";

import nodemailer from "nodemailer";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

type WaitlistLocale = "tr" | "en";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeLocale(locale?: string): WaitlistLocale {
  return locale?.toLowerCase() === "en" ? "en" : "tr";
}

export async function joinWaitlist(email: string, locale?: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedLocale = normalizeLocale(locale);

  if (!isValidEmail(normalizedEmail)) {
    throw new Error("INVALID_EMAIL");
  }

  // Deterministic ID: aynı e-posta tekrar gelirse aynı doküman güncellenir.
  const waitlistId = Buffer.from(normalizedEmail).toString("base64url");
  const db = getAdminDb();
  const waitlistDocRef = db.collection("waitlist").doc(waitlistId);
  const waitlistSnapshot = await waitlistDocRef.get();
  const alreadyJoined = waitlistSnapshot.exists;

  await waitlistDocRef.set(
    {
      waitlistId,
      email: normalizedEmail,
      locale: normalizedLocale,
      ...(alreadyJoined ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  // Ayni e-posta daha once kayitliyse tekrar hos geldin maili gonderme.
  if (alreadyJoined) {
    return {
      ok: true,
      status: "already_joined" as const,
      waitlistId,
      recipient: normalizedEmail,
      accepted: [] as string[],
    };
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // SMTP henüz tanımlı değilse client-side waitlist kaydı çalışmaya devam etsin.
  if (!smtpHost || !smtpUser || !smtpPass) {
    return {
      ok: true,
      status: "added" as const,
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

  const isEnglish = normalizedLocale === "en";
  const subject = isEnglish
    ? "Welcome to the Score AI waitlist"
    : "Score AI bekleme listesine hos geldiniz";
  const textBody = isEnglish
    ? "Hi,\n\nYou have successfully joined the Score Waitlist.\nWhen Score is ready, you will be among the first users to get early access.\nWe will share important product updates with you during this process.\n\nScore AI\ninfo@usescore.net"
    : "Merhaba,\n\nScore Waitlist'e basariyla katildiniz.\nScore hazir oldugunda erken erisim hakki kazanan ilk kullanicilar arasinda olacaksiniz.\nBu surecte onemli urun guncellemelerini sizinle paylasacagiz.\n\nScore AI\ninfo@usescore.net";
  const htmlTitle = isEnglish ? "Hi," : "Merhaba,";
  const htmlParagraph = isEnglish
    ? "You have successfully joined the Score Waitlist.<br/>When Score is ready, you will be among the first users to get early access.<br/>We will share important product updates with you during this process."
    : "Score Waitlist'e basariyla katildiniz.<br/>Score hazir oldugunda erken erisim hakki kazanan ilk kullanicilar arasinda olacaksiniz.<br/>Bu surecte onemli urun guncellemelerini sizinle paylasacagiz.";

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
        <p style="font-size: 16px; margin: 0 0 16px;">${htmlTitle}</p>
        <p style="font-size: 16px; margin: 0 0 16px;">
          ${htmlParagraph}
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
    status: "added" as const,
    waitlistId,
    recipient: normalizedEmail,
    accepted: mailResult.accepted,
  };
}
