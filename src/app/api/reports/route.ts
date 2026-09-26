import { FieldValue } from 'firebase-admin/firestore';
import { uploadImageBase64 } from '@/lib/server/cloudinary';
import { COLLECTIONS, getFirebaseDb } from '@/lib/server/firebase';
import { ApiError, ok, readJson, route, str } from '@/lib/server/http';
import { getCategoryByName, MAX_PHOTOS, STRUCTURED_NAMES } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT = 1200;
const PUBLIC_ID_RE = /^sipedas\/[a-z0-9_-]+\/[a-zA-Z0-9_-]+$/;

interface IncomingPhoto {
  publicId?: string;
  url?: string;
  mime?: string;
  sizeKB?: number;
  source?: string;
  watermarked?: boolean;
  gps?: { lat: number; lng: number } | null;
  address?: string | null;
  capturedAt?: string | null;
  /** Fallback: data URL diunggah server (dipakai bila upload langsung gagal). */
  data?: string;
}

interface IncomingReport {
  requestId?: string;
  kegiatan?: string;
  tanggal?: string;
  kecamatan?: string;
  desaKelurahan?: string;
  detailAlamat?: string;
  keterangan?: string;
  /** Alamat gabungan dari isian form (detail, kelurahan, kecamatan, wilayah). */
  alamatLengkap?: string;
  lat?: number | null;
  lng?: number | null;
  coordSource?: string;
  coordAccuracy?: number | null;
  photos?: IncomingPhoto[];
}

export async function POST(request: Request) {
  return route(async () => {
    const body = await readJson<IncomingReport>(request);

    const kegiatan = str(body.kegiatan, 80);
    if (!STRUCTURED_NAMES.includes(kegiatan)) {
      throw new ApiError('Kategori laporan tidak dikenali.', 400, 'invalid_category');
    }

    const tanggal = str(body.tanggal, 10);
    if (!DATE_RE.test(tanggal)) {
      throw new ApiError('Tanggal laporan tidak valid.', 400, 'invalid_date');
    }

    const kecamatan = str(body.kecamatan, 60);
    const desaKelurahan = str(body.desaKelurahan, 60);
    const detailAlamat = str(body.detailAlamat, MAX_TEXT);
    if (!kecamatan || !desaKelurahan || !detailAlamat) {
      throw new ApiError('Data lokasi belum lengkap.', 400, 'incomplete_location');
    }

    const keterangan = str(body.keterangan, MAX_TEXT);
    const koordinat = normalizeGps(body.lat, body.lng);
    const coordSource = body.coordSource === 'gps' ? 'gps' : body.coordSource === 'manual' ? 'manual' : null;
    const coordAccuracy = Number(body.coordAccuracy);
    const incoming = Array.isArray(body.photos) ? body.photos : [];
    if (incoming.length < 1 || incoming.length > MAX_PHOTOS) {
      throw new ApiError(`Jumlah foto harus antara 1 dan ${MAX_PHOTOS}.`, 400, 'invalid_photo_count');
    }

    const category = getCategoryByName(kegiatan)!;
    const folder = `sipedas/${category.slug}`;
    const uploaded: Array<Record<string, unknown>> = [];

    for (const photo of incoming) {
      uploaded.push(await resolvePhoto(photo, category.slug, folder));
    }

    const doc = {
      schema: 1,
      kegiatan,
      kategori: category.slug,
      tanggal,
      kecamatan,
      desaKelurahan,
      detailAlamat,
      keterangan,
      alamatLengkap: str(body.alamatLengkap, 400) || null,
      koordinat: koordinat
        ? {
            lat: koordinat.lat,
            lng: koordinat.lng,
            sumber: coordSource,
            akurasiMeter: Number.isFinite(coordAccuracy) ? Number(coordAccuracy.toFixed(1)) : null,
          }
        : null,
      jumlahFoto: uploaded.length,
      photos: uploaded,
      sumber: 'sipedas-mobile',
      userAgent: str(request.headers.get('user-agent'), 200),
      createdAt: FieldValue.serverTimestamp(),
    };

    const db = getFirebaseDb();
    const collection = db.collection(COLLECTIONS.reports);
    const requestId = str(body.requestId, 80);

    // Idempoten: retry dengan requestId yang sama tidak membuat duplikat.
    if (/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) {
      const ref = collection.doc(requestId);
      const existing = await ref.get();
      if (existing.exists) {
        return ok({ id: requestId, jumlahFoto: uploaded.length, deduplicated: true });
      }
      await ref.set(doc);
      return ok({ id: requestId, jumlahFoto: uploaded.length });
    }

    const ref = await collection.add(doc);
    return ok({ id: ref.id, jumlahFoto: uploaded.length });
  });
}

async function resolvePhoto(photo: IncomingPhoto, slug: string, folder: string) {
  const base = {
    mime: str(photo.mime, 60) || 'image/jpeg',
    sizeKB: Number(photo.sizeKB) || 0,
    source: photo.source === 'camera' ? 'camera' : 'gallery',
    watermarked: Boolean(photo.watermarked),
    gps: normalizeGps(photo.gps?.lat, photo.gps?.lng),
    address: str(photo.address, 300) || null,
    capturedAt: str(photo.capturedAt, 40) || null,
  };

  const publicId = str(photo.publicId, 200);
  if (publicId && PUBLIC_ID_RE.test(publicId)) {
    return { ...base, publicId, url: str(photo.url, 500) };
  }

  const data = typeof photo.data === 'string' ? photo.data : '';
  if (!data.startsWith('data:image/')) {
    throw new ApiError('Data foto tidak valid.', 400, 'invalid_photo');
  }

  const asset = await uploadImageBase64(data, {
    folder,
    publicId: `${slug}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tags: ['sipedas', slug],
  });

  return { ...base, publicId: asset.publicId, url: asset.url };
}

function normalizeGps(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (lat == null || lng == null) return null;
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
  if (Math.abs(latNum) > 90 || Math.abs(lngNum) > 180) return null;
  if (latNum === 0 && lngNum === 0) return null;
  return { lat: Number(latNum.toFixed(6)), lng: Number(lngNum.toFixed(6)) };
}
