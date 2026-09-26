import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

/** Klien autentikasi yang dipakai googleapis. */
type GoogleAuthClient = OAuth2Client | GoogleAuth;

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;
type GoogleAuth = InstanceType<typeof google.auth.GoogleAuth>;

let cachedAuth: GoogleAuthClient | null = null;

/**
 * Autentikasi Google.
 *
 * Prioritaskan OAuth2 (refresh token) karena service account tidak punya kuota
 * penyimpanan Drive. Fallback ke service account untuk instalasi lokal.
 */
function resolveAuth(): GoogleAuthClient {
  if (cachedAuth) return cachedAuth;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const client = new google.auth.OAuth2(clientId, clientSecret);
    client.setCredentials({ refresh_token: refreshToken });
    cachedAuth = client;
    return cachedAuth;
  }

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      'Kredensial Google belum dikonfigurasi. Isi GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN atau GOOGLE_SERVICE_ACCOUNT_JSON.',
    );
  }

  let credentials: Record<string, string>;
  try {
    credentials = JSON.parse(raw);
    if (typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
  } catch (error) {
    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_JSON bukan JSON yang valid: ${(error as Error).message}`,
    );
  }

  cachedAuth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
  return cachedAuth;
}

export function getDrive() {
  return google.drive({ version: 'v3', auth: resolveAuth() });
}

export function getSheets() {
  return google.sheets({ version: 'v4', auth: resolveAuth() });
}

export function getSpreadsheetId(): string {
  const id = process.env.SPREADSHEET_UTAMA_ID || process.env.GOOGLE_SHEET_ID || '';
  if (!id) throw new Error('GOOGLE_SHEET_ID belum dikonfigurasi.');
  return id;
}

export function getMainFolderId(): string {
  const id = process.env.FOLDER_UTAMA_ID || process.env.GOOGLE_DRIVE_FOLDER_ID || '';
  if (!id) throw new Error('FOLDER_UTAMA_ID belum dikonfigurasi.');
  return id;
}
