import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;

/**
 * Firestore'a sunucu tarafında (güvenlik kurallarını bypass ederek) erişmek için
 * Firebase Admin SDK örneği. Yalnızca doğrulanmış admin akışlarında kullanılır.
 *
 * Gerekli env: FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
 * (projectId, mevcut NEXT_PUBLIC_FIREBASE_PROJECT_ID'den alınır).
 */
export function getAdminDb(): Firestore {
  if (cachedDb) return cachedDb;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error("FIREBASE_ADMIN_NOT_CONFIGURED");
  }

  // .env içindeki "\n" kaçış dizileri gerçek satır sonuna çevrilir.
  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  cachedApp =
    getApps().length > 0
      ? getApps()[0]!
      : initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
        });

  cachedDb = getFirestore(cachedApp);
  return cachedDb;
}
