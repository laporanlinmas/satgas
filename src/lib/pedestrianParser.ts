/**
 * Parser teks laporan Patroli Pedestrian.
 *
 * Dipakai bersama oleh client (validasi langsung saat mengetik) dan server
 * (otoritatif saat menyimpan ke Spreadsheet) agar pratinjau di layar selalu
 * sama dengan hasil akhir.
 */

const MONTH_INDEX: Record<string, number> = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};

/** Nama bagian yang wajib terbaca, dalam urutan tampil. */
export const REQUIRED_FIELDS = [
  'lokasi',
  'hari',
  'tanggal',
  'identitas',
  'personil',
  'danru',
] as const;

export type ReportField = (typeof REQUIRED_FIELDS)[number];

export const FIELD_LABELS: Record<ReportField, string> = {
  lokasi: 'Lokasi patroli',
  hari: 'Hari',
  tanggal: 'Tanggal',
  identitas: 'Identitas pelanggaran',
  personil: 'Personil',
  danru: 'Danru',
};

/** Bersihkan format WhatsApp (bold markdown, zero-width, baris kembar). */
export function cleanReportText(text: string): string {
  return String(text || '')
    .replace(/[*_~`]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function firstMatch(text: string, pattern: string): string {
  const match = new RegExp(pattern, 'is').exec(text);
  return match?.[1] ? match[1].trim() : '';
}

/**
 * Ambil isi satu bagian laporan. Batas bagian ditentukan judul bagian
 * berikutnya supaya beberapa variasi label tetap tertangani.
 */
function extractSection(text: string, label: RegExp, nextLabels: RegExp): string {
  const match = label.exec(text);
  if (!match) return '';
  const afterLabel = text.slice(match.index + match[0].length);
  const end = nextLabels.exec(afterLabel);
  return afterLabel
    .slice(0, end?.index ?? afterLabel.length)
    .replace(/^[\s:：\-–—]+/, '')
    .replace(/\s+$/, '')
    .trim();
}

export interface ParsedReport {
  nomorSpt: string;
  lokasi: string;
  hari: string;
  tanggal: string;
  identitas: string;
  personil: string;
  danru: string;
  namaDanru: string;
  keterangan: string;
  /** Bagian yang tidak ditemukan. */
  missing: ReportField[];
}

export function parseReport(rawText: string): ParsedReport {
  const text = cleanReportText(rawText);

  const danruMatch = /Danru\s*\d+/i.exec(text);
  const danru = danruMatch ? danruMatch[0].trim() : '';

  let namaDanru = firstMatch(text, 'Danru\\s*\\d+\\s*\\(\\s*(.*?)\\s*\\)');
  if (!namaDanru) namaDanru = firstMatch(text, 'Danru\\s+(?:\\d+\\s*)?([A-Za-z][A-Za-z\\s\\.]{1,40})');
  namaDanru = namaDanru.replace(/[\s.]+$/, '');

  // Lokasi: holographic "…di <lokasi> Sebagai …", atau sampai baris berikutnya.
  const lokasi =
    firstMatch(text, 'Patroli\\s*(?:Linmas\\s*)?Pedestrian\\s*di\\s+(.*?)\\s+Sebagai') ||
    firstMatch(
      text,
      'Patroli\\s*(?:Linmas\\s*)?Pedestrian\\s*di\\s+([^\\n]+?)\\s*(?:\\n|$)',
    );

  const parsed: ParsedReport = {
    nomorSpt: firstMatch(text, 'Nomor\\s*SPT\\s*([\\s\\S]*?)\\s*Hari\\s*Pelaksanaan'),
    lokasi: lokasi.replace(/\s+/g, ' '),
    hari: firstMatch(text, 'Hari\\s*:\\s*([^\\n]+?)\\s*(?:\\n|$)'),
    tanggal:
      firstMatch(text, 'Tanggal\\s*:\\s*([^\\n]+?)\\s*(?=\\n\\s*Identitas|\\n\\s*Status\\s+Identitas|\\n\\s*Personil|\\n|$)') ||
      firstMatch(text, 'Tanggal\\s*:\\s*(.*?)\\s+Identitas'),
    identitas: extractSection(
      text,
      /(?:^|\n)\s*(?:[-•]\s*)?(?:(?:status\s+)?identitas\s*(?:\/\s*nama)?\s*(?:pelanggaran|pelanggar)?|nama\s*pelargar?an?)\b[^\n:：]{0,20}[:：\-–—]?\s*/im,
      /(?:^|\n)\s*(?:[-•]\s*)?(?:personil\b|pelaksanaan\b|keterangan\b|danru\b|demikian\b)/im,
    ),
    personil:
      firstMatch(
        text,
        'Personil\\s*yang\\s*terlibat\\s*:\\s*\\((.*?)\\)\\s*(?:Pelaksanaan|Keterangan|Danru|Demikian)',
      ) ||
      firstMatch(
        text,
        'Personil\\s*yang\\s*terlibat\\s*:\\s*([^\\n]+?)\\s*(?:\\n|$)',
      ),
    danru,
    namaDanru,
    keterangan: firstMatch(text, '(?:Pelaksanaan|Keterangan)\\s*:\\s*(.*?)\\s*(?=Demikian)'),
    missing: [],
  };

  const required: Array<[ReportField, string]> = [
    ['lokasi', parsed.lokasi],
    ['hari', parsed.hari],
    ['tanggal', parsed.tanggal],
    ['identitas', parsed.identitas],
    ['personil', parsed.personil],
    ['danru', parsed.danru],
  ];
  parsed.missing = required.filter(([, value]) => !value).map(([key]) => key);

  return parsed;
}

/** Tanggal Indonesia ("Sabtu, 26 September 2026") menjadi Date. */
export function parseIndonesianDate(value: string): Date | null {
  if (!value) return null;
  const normalized = value.replace(/^[A-Za-z]+,?\s*/i, '').trim().toLowerCase();
  const long = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/.exec(normalized);
  if (long && MONTH_INDEX[long[2]] !== undefined) {
    return new Date(Number(long[3]), MONTH_INDEX[long[2]], Number(long[1]));
  }
  const short = /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(value);
  if (short) {
    return new Date(Number(short[3]), Number(short[2]) - 1, Number(short[1]));
  }
  return null;
}

/** Nama berkas foto di Drive, mis. "[KAMERA]_26 September 2026_Suyatno_1.jpg". */
export function buildPhotoFileName(options: {
  source: string;
  date: Date;
  namaDanru?: string;
  index: number;
  total: number;
  extension: string;
}): string {
  const prefix = options.source === 'camera' ? '[KAMERA]' : '[GALERI]';
  const person = options.namaDanru
    ? '_' + options.namaDanru.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)
    : '';
  const suffix = options.total > 1 ? `_${options.index}` : '';
  return `${prefix}_${formatDateFolder(options.date)}${person}${suffix}${options.extension}`;
}

const MONTHS_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export function formatMonthFolder(date: Date): string {
  return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateFolder(date: Date): string {
  return `${date.getDate()} ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
    'image/bmp': '.bmp',
  };
  return map[(mime || '').toLowerCase()] || '.jpg';
}
