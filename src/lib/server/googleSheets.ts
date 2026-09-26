import { getSheets, getSpreadsheetId } from './googleAuth';
import { parseReport } from '../pedestrianParser';
import { formatWib } from '../format';

export const SHEET = {
  reports: 'INPUT',
  photos: 'Detail Foto',
} as const;

/** Jumlah kolom foto pada sheet INPUT (kolom M sampai V). */
export const PHOTO_COLUMNS = 10;

export { parseReport, buildPhotoFileName, parseIndonesianDate, mimeToExt } from '../pedestrianParser';
export type { ParsedReport } from '../pedestrianParser';

/* ── Struktur baris ─────────────────────────────────────────────── */

export interface PhotoMeta {
  hasGps?: boolean;
  lat?: number | null;
  lng?: number | null;
  datetime?: string | null;
  address?: string | null;
  source?: string;
}

export interface PhotoLink {
  link: string;
  namaFile: string;
  source?: string;
  meta?: PhotoMeta | null;
}

export interface ReportRowInput {
  parsed: ReturnType<typeof parseReport>;
  photos: PhotoLink[];
  folderUrl?: string;
  createdAt?: Date;
}

export interface PhotoRowInput {
  tanggal: string;
  danru: string;
  namaFile: string;
  source: string;
  meta?: PhotoMeta | null;
  linkDrive: string;
  ket?: string;
  createdAt?: Date;
}

/* ── Pembentuk baris (fungsi murni) ──────────────────────────────── */

/** Baris utama laporan di sheet INPUT. */
export function buildReportRow(input: ReportRowInput): (string | number)[] {
  const { parsed, photos } = input;
  const photoCells: string[] = Array.from(
    { length: PHOTO_COLUMNS },
    (_, index) => photos[index]?.link ?? '',
  );

  return [
    formatWib(input.createdAt ?? new Date()),
    parsed.nomorSpt || '-',
    parsed.lokasi || '-',
    parsed.hari || '-',
    parsed.tanggal || '-',
    parsed.identitas || '-',
    parsed.personil || '-',
    parsed.danru || '-',
    parsed.namaDanru || '-',
    parsed.keterangan || '',
    input.folderUrl || '',
    photos.length,
    ...photoCells,
  ];
}

/** Baris log detail foto di sheet "Detail Foto". */
export function buildPhotoRow(options: PhotoRowInput): (string | number)[] {
  const meta = options.meta || {};
  const hasCoordinates = typeof meta.lat === 'number' && typeof meta.lng === 'number';
  const mapsLink = hasCoordinates ? `https://www.google.com/maps?q=${meta.lat},${meta.lng}` : '-';

  return [
    formatWib(options.createdAt ?? new Date()),
    options.tanggal || '-',
    options.danru || '-',
    options.namaFile || '-',
    options.source === 'camera' ? 'KAMERA' : options.source === 'gallery' ? 'GALERI' : 'MOBILE',
    hasCoordinates ? 'Ya' : 'Tidak',
    hasCoordinates ? (meta.lat as number) : '-',
    hasCoordinates ? (meta.lng as number) : '-',
    mapsLink,
    meta.datetime || '-',
    meta.address || '-',
    options.ket || '-',
    options.linkDrive || '',
  ];
}

/* ── Penulisan sheet ─────────────────────────────────────────────── */

async function appendRows(sheetName: string, rows: (string | number)[][]): Promise<void> {
  if (!rows.length) return;
  await getSheets().spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A:A`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: rows },
  } as never);
}

/** Tulis baris laporan beserta seluruh detail foto dalam dua operasi. */
export async function saveReportWithPhotos(
  report: ReportRowInput,
  photos: PhotoRowInput[],
): Promise<void> {
  await appendRows(SHEET.reports, [buildReportRow(report)]);
  if (photos.length) await appendRows(SHEET.photos, photos.map(buildPhotoRow));
}
