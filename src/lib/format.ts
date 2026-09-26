/** Utilitas format yang dipakai lintas fitur (konsisten untuk semua alur). */

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const MONTHS_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const WEEKDAYS_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const TZ = 'Asia/Jakarta';

export { MONTHS_SHORT, MONTHS_LONG, WEEKDAYS_LONG, TZ };

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function pad3(value: number): string {
  return value < 10 ? `00${value}` : value < 100 ? `0${value}` : String(value);
}

/** "26-09-2026 14:05" — untuk nama file. */
export function stampCompact(date = new Date()): string {
  return [
    pad2(date.getDate()),
    pad2(date.getMonth() + 1),
    date.getFullYear(),
    '_',
    pad2(date.getHours()),
    pad2(date.getMinutes()),
  ].join('-');
}

/** "26/09/2026 14:05:33" — untuk watermark & label. */
export function stampHuman(date = new Date()): string {
  return [
    pad2(date.getDate()),
    pad2(date.getMonth() + 1),
    date.getFullYear(),
    pad2(date.getHours()),
    pad2(date.getMinutes()),
    pad2(date.getSeconds()),
  ].join('/');
}

/** "Sabtu, 26 September 2026" */
export function stampLongWib(date = new Date()): string {
  const wib = toWib(date);
  return `${WEEKDAYS_LONG[wib.getDay()]}, ${wib.getDate()} ${MONTHS_LONG[wib.getMonth()]} ${wib.getFullYear()}`;
}

/** "26 September 2026, 14:05 WIB" */
export function stampMediumWib(date = new Date()): string {
  const wib = toWib(date);
  return `${wib.getDate()} ${MONTHS_LONG[wib.getMonth()]} ${wib.getFullYear()}, ${pad2(wib.getHours())}.${pad2(wib.getMinutes())} WIB`;
}

/**
 * Ubah waktu ke representasi Zona WIB tanpa bergantung pada locale server.
 * Dipakai server-side agar hasil sheet konsisten antar region.
 */
export function toWib(date: Date): Date {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
  return new Date(utcMs + 7 * 60 * 60_000);
}

export function formatWib(date = new Date()): string {
  const wib = toWib(date);
  return [
    pad2(wib.getDate()),
    pad2(wib.getMonth() + 1),
    wib.getFullYear(),
    pad2(wib.getHours()),
    pad2(wib.getMinutes()),
    pad2(wib.getSeconds()),
  ].join('/');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatSizeKB(sizeKB: number): string {
  return sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)}MB` : `${sizeKB}KB`;
}

/** Perkiraan ukuran byte dari data URL base64 tanpa decoding penuh. */
export function base64ByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const body = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((body.length * 3) / 4) - padding);
}

export function stripBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

/** "2026-09-26" dari objek Date lokal. */
export function toDateInputValue(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatDateInput(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day || month > 12 || day > 31) return '';
  return `${day} ${MONTHS_LONG[month - 1]} ${year}`;
}

export function slugify(value: string, maxLength = 24): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength);
}

export function truncate(value: string, max = 80): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
