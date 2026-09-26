import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;

function readServiceAccount(): Record<string, string> {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT belum dikonfigurasi. Isi variabel tersebut di environment server.',
    );
  }

  try {
    const parsed = JSON.parse(raw);
    const privateKey =
      typeof parsed.private_key === 'string' ? parsed.private_key.replace(/\\n/g, '\n') : parsed.private_key;
    return { ...parsed, private_key: privateKey };
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT bukan JSON yang valid.');
  }
}

/** Inisialisasi Firebase Admin sekali per instance server. */
export function getFirebaseApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  if (existing.length) {
    cachedApp = existing[0];
    return cachedApp;
  }
  cachedApp = initializeApp({ credential: cert(readServiceAccount()) });
  return cachedApp;
}

export function getFirebaseDb(): Firestore {
  if (cachedDb) return cachedDb;
  cachedDb = getFirestore(getFirebaseApp());
  return cachedDb;
}

/** Nama koleksi yang dipakai aplikasi. */
export const COLLECTIONS = {
  reports: 'laporan',
  drafts: 'draft-laporan',
} as const;
