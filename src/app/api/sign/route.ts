import { route, ok, str } from '@/lib/server/http';
import { getCloudinaryConfig, signUpload } from '@/lib/server/cloudinary';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 15;

const PUBLIC_ID_SAFE = /^[a-zA-Z0-9_\-]+$/;

/**
 * Menyediakan parameter tanda tangan Cloudinary agar foto diunggah langsung dari
 * browser (tidak melewati body Next.js yang dibatasi 4.5 MB) sekaligus
 * melaporkan status konfigurasi server.
 */
export async function GET(request: Request) {
  return route(async () => {
    const params = new URL(request.url).searchParams;
    const scope = str(params.get('scope'), 40) || 'umum';
    const index = Math.min(Math.max(Number(params.get('index')) || 1, 1), 99);

    const { cloudName, apiKey, hasSecret } = getCloudinaryConfig();
    const ready = Boolean(cloudName && apiKey && hasSecret);

    const config = {
      cloudinary: ready,
      firebase: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
      google: Boolean(
        (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) ||
          process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      ),
      sheet: Boolean(process.env.SPREADSHEET_UTAMA_ID || process.env.GOOGLE_SHEET_ID),
      drive: Boolean(process.env.FOLDER_UTAMA_ID || process.env.GOOGLE_DRIVE_FOLDER_ID),
      appsScript: Boolean(process.env.APPS_SCRIPT_URL),
    };

    if (!ready) {
      return ok({ mode: 'server' as const, params: null, config });
    }

    const stamp = Date.now();
    const publicId = `${sanitize(scope)}_${stamp}_${index}`;
    const timestamp = Math.floor(stamp / 1000);

    return ok({
      mode: 'direct' as const,
      config,
      params: signUpload({
        timestamp,
        folder: `sipedas/${sanitize(scope)}`,
        publicId,
        tags: ['sipedas', sanitize(scope)],
      }),
    });
  });
}

function sanitize(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  return PUBLIC_ID_SAFE.test(cleaned) ? cleaned : 'umum';
}
