/**
 * Konstanta global aplikasi SIPEDAS.
 * Satu sumber kebenaran untuk identitas aplikasi, kategori laporan, dan
 * metadata yang dipakai oleh server maupun client.
 */

export const APP_NAME = 'SIPEDAS';
export const APP_VERSION = '5.0.0';
export const APP_TAGLINE = 'Sistem Pelaporan Digital Satgas Linmas';
export const APP_WILAYAH = 'Ponorogo, Jawa Timur';
export const APP_CONTACT_WA = '6285159686554';

/** Bagian wilayah yang selalu menutup alamat pada watermark & laporan. */
export const APP_KABUPATEN = 'Ponorogo';
export const APP_PROVINSI = 'Jawa Timur';
export const APP_NEGARA = 'Indonesia';

/** Titik pusat peta (kota Ponorogo) + zoom default saat memilih koordinat. */
export const MAP_DEFAULT = { lat: -7.8697, lng: 111.4708, zoom: 14 } as const;
/** Zoom saat koordinat sudah diketahui (dipakai modal peta). */
export const MAP_PICK_ZOOM = 18;
/** Batas akurasi GPS (meter) yang masih dianggap layak. */
export const GPS_MAX_ACCURACY_M = 100;

export const DEVELOPER_NAME = 'Ahmad Abdul Basith, S.Tr.I.P';
export const DEVELOPER_ROLE = 'Developer & Author SI-PEDAS';
export const DEVELOPER_PHOTO = '/assets/basith.jpeg';

/** Nama utama yang dicetak sebagai judul watermark foto, untuk semua kategori. */
export const WATERMARK_BRAND = 'SATGAS LINMAS';

/** Jenis alur kerja sebuah kategori. */
export type FlowKind = 'structured' | 'pedestrian';

export type CategoryTone = 'teal' | 'amber' | 'rose' | 'orange' | 'blue' | 'violet';

export type CategoryIcon =
  | 'shield'
  | 'landmark'
  | 'heart'
  | 'flame'
  | 'users'
  | 'briefcase';

export interface CategoryDef {
  /** Slug URL, juga dipakai sebagai scope penyimpanan lokal. */
  slug: string;
  /** Label yang tampil di form dan di sheet. */
  name: string;
  description: string;
  href: string;
  tone: CategoryTone;
  icon: CategoryIcon;
  flow: FlowKind;
  /** Penetapan fotos kopi otomatis untuk kategori tanpa label khusus. */
  photoHint: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    slug: 'pedestrian',
    name: 'Pedestrian',
    description: 'Patroli & aksi lapangan',
    href: '/pedestrian',
    tone: 'teal',
    icon: 'shield',
    flow: 'pedestrian',
    photoHint: 'Foto kamera + QR lokasi',
  },
  {
    slug: 'poskamling',
    name: 'Poskamling',
    description: 'Aktivitas keamanan & vigilant lingkungan',
    href: '/poskamling',
    tone: 'amber',
    icon: 'landmark',
    flow: 'structured',
    photoHint: 'Foto bukti kegiatan pos kamling',
  },
  {
    slug: 'posyandu',
    name: 'Posyandu',
    description: 'Layanan kesehatan & gizi masyarakat',
    href: '/posyandu',
    tone: 'rose',
    icon: 'heart',
    flow: 'structured',
    photoHint: 'Foto kegiatan posyandu',
  },
  {
    slug: 'kebencanaan',
    name: 'Kebencanaan',
    description: 'Kesiapsiagaan & penanganan bencana',
    href: '/kebencanaan',
    tone: 'orange',
    icon: 'flame',
    flow: 'structured',
    photoHint: 'Foto dokumentasi penanganan',
  },
  {
    slug: 'yanmas',
    name: 'Pelayanan Masyarakat',
    description: 'Layanan & kegiatan warga',
    href: '/yanmas',
    tone: 'blue',
    icon: 'users',
    flow: 'structured',
    photoHint: 'Foto dokumentasi layanan',
  },
  {
    slug: 'lainnya',
    name: 'Lainnya',
    description: 'Kegiatan satgas lainnya',
    href: '/lainnya',
    tone: 'violet',
    icon: 'briefcase',
    flow: 'structured',
    photoHint: 'Foto dokumentasi kegiatan',
  },
];

/** Kategori dengan alur form terstruktur (kecuali pedestrian). */
export const STRUCTURED_CATEGORIES = CATEGORIES.filter(category => category.flow === 'structured');

export const PEDESTRIAN_CATEGORY = CATEGORIES.find(category => category.flow === 'pedestrian')!;

/** Nama kategori yang boleh diterima server (sinkron dengan validasi API). */
export const STRUCTURED_NAMES: string[] = STRUCTURED_CATEGORIES.map(category => category.name);

export function getCategoryBySlug(slug: string): CategoryDef | undefined {
  return CATEGORIES.find(category => category.slug === slug);
}

export function getCategoryByName(name: string): CategoryDef | undefined {
  return CATEGORIES.find(category => category.name === name);
}

/** Batas jumlah foto per laporan. */
export const MAX_PHOTOS = 10;

/** Batas ukuran foto setelah diproses (KB). */
export const MAX_PHOTO_KB = 400;

/** Batas ukuran payload server (bytes) — 1 foto per request. */
export const MAX_UPLOAD_BYTES = 400 * 1024;

/** Zona waktu seluruh penanggalan laporan. */
export const APP_TIMEZONE = 'Asia/Jakarta';
