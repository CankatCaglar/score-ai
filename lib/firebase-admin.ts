import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;
let cachedStorage: Storage | null = null;
let cachedBucketName: string | null = null;

function normalizeBucketName(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("gs://")) {
    return trimmed.replace(/^gs:\/\//, "").replace(/\/+$/, "");
  }
  return trimmed.replace(/\/+$/, "");
}

export function getAdminStorageBucketName(): string {
  if (cachedBucketName) return cachedBucketName;
  const fromEnv = normalizeBucketName(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const fallback = projectId ? `${projectId}.appspot.com` : null;
  const bucketName = fromEnv || fallback;
  if (!bucketName) {
    throw new Error("FIREBASE_STORAGE_BUCKET_NOT_CONFIGURED");
  }
  cachedBucketName = bucketName;
  return bucketName;
}

function getOrInitAdminApp(): App {
  if (cachedApp) return cachedApp;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    throw new Error("FIREBASE_ADMIN_NOT_CONFIGURED");
  }

  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");
  cachedApp =
    getApps().length > 0
      ? getApps()[0]!
      : initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          storageBucket: getAdminStorageBucketName(),
        });
  return cachedApp;
}

/**
 * Firestore'a sunucu tarafında (güvenlik kurallarını bypass ederek) erişmek için
 * Firebase Admin SDK örneği. Yalnızca doğrulanmış admin akışlarında kullanılır.
 *
 * Gerekli env: FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
 * (projectId, mevcut NEXT_PUBLIC_FIREBASE_PROJECT_ID'den alınır).
 */
export function getAdminDb(): Firestore {
  if (cachedDb) return cachedDb;

  const app = getOrInitAdminApp();
  cachedDb = getFirestore(app);
  return cachedDb;
}

export function getAdminStorage(): Storage {
  if (cachedStorage) return cachedStorage;
  const app = getOrInitAdminApp();
  cachedStorage = getStorage(app);
  return cachedStorage;
}
