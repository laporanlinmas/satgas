import { ok, route, str } from '@/lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * Diagnostik konfigurasi server.
 * Dipakai halaman Pengaturan agar masalah integrasi bisa diketahui langsung.
 */
export async function GET() {
  return route(async () => {
    const checks = {
      firebase: Boolean(
        process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      ),
      firestore: Boolean(
        process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      ),
      cloudinary: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET,
      ),
      googleOAuth: Boolean(
        process.env.GOOGLE_CLIENT_ID &&
          process.env.GOOGLE_CLIENT_SECRET &&
          process.env.GOOGLE_REFRESH_TOKEN,
      ),
      googleServiceAccount: Boolean(
        process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      ),
      sheet: Boolean(process.env.SPREADSHEET_UTAMA_ID || process.env.GOOGLE_SHEET_ID),
      driveFolder: Boolean(process.env.FOLDER_UTAMA_ID || process.env.GOOGLE_DRIVE_FOLDER_ID),
      appsScript: Boolean(process.env.APPS_SCRIPT_URL),
      cctv: str(process.env.NEXT_PUBLIC_CCTV_URL, 300),
    };

    return ok({
      checks,
      waktu: new Date().toISOString(),
      versi: process.env.npm_package_version || null,
    });
  });
}
