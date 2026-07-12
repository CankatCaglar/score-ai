import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import admin from "firebase-admin";

function mustEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function main() {
  const projectId = mustEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const clientEmail = mustEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
  const rawPrivateKey = mustEnv("FIREBASE_ADMIN_PRIVATE_KEY");
  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  const app =
    admin.apps[0] ??
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  const db = app.firestore();

  const appBaseUrl = process.env.APP_BASE_URL ?? "https://usescore.net";
  const expiryDays = Number(process.env.EARLY_ACCESS_INVITE_EXPIRY_DAYS ?? "30");
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
  );

  const waitlistSnapshot = await db.collection("waitlist").get();
  const rows = [];
  let createdCount = 0;

  for (const waitlistDoc of waitlistSnapshot.docs) {
    const data = waitlistDoc.data();
    const email = String(data.email ?? "").trim().toLowerCase();
    const locale = data.locale === "en" ? "en" : "tr";
    if (!email) continue;

    // Daha once davet uretilen kayitlari atla.
    if (data.inviteIssuedAt || data.inviteHash) {
      continue;
    }

    const rawToken = createToken();
    const inviteHash = hashToken(rawToken);

    await db.collection("early_access_invites").doc(inviteHash).set({
      inviteHash,
      waitlistId: waitlistDoc.id,
      email,
      locale,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      usedAt: null,
      revokedAt: null,
    });

    await waitlistDoc.ref.set(
      {
        inviteHash,
        inviteIssuedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    rows.push({
      email,
      locale,
      invite_url: `${appBaseUrl}/invite/${rawToken}`,
    });
    createdCount += 1;
  }

  await fs.mkdir(path.resolve(process.cwd(), "exports"), { recursive: true });
  const datePart = new Date().toISOString().replaceAll(":", "-");
  const csvPath = path.resolve(
    process.cwd(),
    "exports",
    `early-access-invites-${datePart}.csv`,
  );

  const csv = [
    ["email", "locale", "invite_url"].map(csvEscape).join(","),
    ...rows.map((row) =>
      [row.email, row.locale, row.invite_url].map(csvEscape).join(","),
    ),
  ].join("\n");

  await fs.writeFile(csvPath, `\uFEFF${csv}`, "utf8");

  console.log(`Created invite links: ${createdCount}`);
  console.log(`CSV output: ${csvPath}`);
  console.log(
    "Next step: Import CSV into Brevo and map columns (email, locale, invite_url).",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
