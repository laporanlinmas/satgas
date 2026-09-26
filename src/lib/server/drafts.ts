import { FieldValue } from 'firebase-admin/firestore';
import { destroyImage, uploadImageBase64 } from './cloudinary';
import { COLLECTIONS, getFirebaseDb } from './firebase';

const FOLDER_ROOT = 'sipedas/draft';

export interface DraftPhotoAsset {
  url: string;
  publicId: string;
  mime: string;
  source: string;
  sizeKB: number;
}

export interface DraftPhotoMeta {
  hasGps: boolean;
  lat: number | null;
  lng: number | null;
  datetime: string | null;
  address: string | null;
  source: string;
}

export interface DraftSummary {
  draftId: string;
  scope: string;
  timestamp: string;
  jumlahFoto: number;
  teksPreview: string;
  dibuatPada: string | null;
}

export interface DraftDetail extends DraftSummary {
  teks: string;
  photos: DraftPhotoAsset[];
  exifMeta: DraftPhotoMeta[];
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function destroyAssets(photos: DraftPhotoAsset[]): Promise<void> {
  await Promise.all(
    photos.filter(photo => Boolean(photo?.publicId)).map(photo => destroyImage(photo.publicId)),
  );
}

/**
 * Buat (atau timpa) draft. Aset foto lama dihapus supaya tidak ada sampah
 * di Cloudinary ketika draft disimpan ulang.
 */
export async function createDraft(options: {
  draftId: string;
  scope: string;
  teks: string;
  label: string;
}): Promise<string> {
  const db = getFirebaseDb();
  const ref = db.collection(COLLECTIONS.drafts).doc(options.draftId);
  const previous = await ref.get();

  if (previous.exists) {
    await destroyAssets((previous.data()?.photos || []) as DraftPhotoAsset[]);
  }

  await ref.set({
    draftId: options.draftId,
    scope: options.scope,
    label: options.label,
    timestamp: new Date().toISOString(),
    teks: options.teks,
    photos: [],
    exifMeta: [],
    jumlahFoto: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return options.draftId;
}

/** Tambahkan satu foto ke draft yang sudah ada. */
export async function appendDraftPhoto(options: {
  draftId: string;
  scope: string;
  dataUrl: string;
  mime: string;
  source: string;
  sizeKB: number;
  exifMeta: DraftPhotoMeta;
}): Promise<{ publicId: string; url: string }> {
  const db = getFirebaseDb();
  const ref = db.collection(COLLECTIONS.drafts).doc(options.draftId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('Draft tidak ditemukan atau sudah dihapus.');

  const asset = await uploadImageBase64(options.dataUrl, {
    folder: `${FOLDER_ROOT}/${options.draftId}`,
    tags: ['sipedas', 'draft', options.scope || 'umum'],
  });

  const data = snapshot.data() || {};
  const photos: DraftPhotoAsset[] = [
    ...((data.photos || []) as DraftPhotoAsset[]),
    {
      url: asset.url,
      publicId: asset.publicId,
      mime: options.mime || 'image/jpeg',
      source: options.source || 'camera',
      sizeKB: toNumber(options.sizeKB),
    },
  ];
  const exifMeta: DraftPhotoMeta[] = [
    ...((data.exifMeta || []) as DraftPhotoMeta[]),
    options.exifMeta || ({} as DraftPhotoMeta),
  ];

  await ref.update({
    photos,
    exifMeta,
    jumlahFoto: photos.length,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { publicId: asset.publicId, url: asset.url };
}

function toSummary(draftId: string, data: Record<string, unknown>): DraftSummary {
  const teks = String(data.teks || '');
  const createdAt = data.createdAt as { toDate?: () => Date } | null;
  return {
    draftId,
    scope: String(data.scope || 'umum'),
    timestamp: String(data.timestamp || '-'),
    jumlahFoto: toNumber(data.jumlahFoto),
    teksPreview: teks.length > 90 ? `${teks.slice(0, 90).replace(/\s+/g, ' ').trim()}…` : teks,
    dibuatPada: createdAt?.toDate ? createdAt.toDate().toISOString() : null,
  };
}

/**
 * Daftar draft untuk satu scope.
 *
 * Hanya memakai filter satu field (indeks otomatis dari Firestore) lalu diurutkan
 * di memori — composite index tidak diperlukan sehingga langsung berfungsi di
 * proyek mana pun tanpa console Firebase.
 */
export async function listDrafts(scope: string, limit = 20): Promise<DraftSummary[]> {
  const snapshot = await getFirebaseDb()
    .collection(COLLECTIONS.drafts)
    .where('scope', '==', scope)
    .limit(Math.max(limit * 4, 40))
    .get();

  return snapshot.docs
    .map(doc => ({ doc, summary: toSummary(doc.id, doc.data() || {}) }))
    .sort((a, b) => {
      const left = a.doc.data()?.createdAt as { toMillis?: () => number } | null;
      const right = b.doc.data()?.createdAt as { toMillis?: () => number } | null;
      const leftMs = left?.toMillis ? left.toMillis() : 0;
      const rightMs = right?.toMillis ? right.toMillis() : 0;
      return rightMs - leftMs;
    })
    .slice(0, limit)
    .map(item => item.summary);
}

async function downloadAsDataUrl(photo: DraftPhotoAsset): Promise<string> {
  const response = await fetch(photo.url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Gagal mengunduh foto draft (${response.status}).`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const mime = response.headers.get('content-type') || photo.mime || 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

export interface LoadedDraftPhoto {
  data: string;
  mime: string;
  source: string;
  sizeKB: number;
  exifMeta: DraftPhotoMeta;
}

/** Muat draft lalu hapus dari server (dan Cloudinary) — draft sekali pakai. */
export async function consumeDraft(draftId: string): Promise<{
  summary: DraftSummary;
  teks: string;
  photos: LoadedDraftPhoto[];
}> {
  const db = getFirebaseDb();
  const ref = db.collection(COLLECTIONS.drafts).doc(draftId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('Draft tidak ditemukan di server.');

  const data = snapshot.data() || {};
  const assets = (data.photos || []) as DraftPhotoAsset[];
  const metas = (data.exifMeta || []) as DraftPhotoMeta[];

  const photos: LoadedDraftPhoto[] = [];
  for (const [index, asset] of assets.entries()) {
    photos.push({
      data: await downloadAsDataUrl(asset),
      mime: asset.mime || 'image/jpeg',
      source: asset.source || 'camera',
      sizeKB: asset.sizeKB,
      exifMeta: metas[index] || ({} as DraftPhotoMeta),
    });
  }

  await destroyAssets(assets);
  await ref.delete();

  return {
    summary: toSummary(draftId, data),
    teks: String(data.teks || ''),
    photos,
  };
}

export async function deleteDraft(draftId: string): Promise<number> {
  const db = getFirebaseDb();
  const ref = db.collection(COLLECTIONS.drafts).doc(draftId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return 0;
  await destroyAssets((snapshot.data()?.photos || []) as DraftPhotoAsset[]);
  await ref.delete();
  return 1;
}

export async function getDraft(draftId: string): Promise<{
  jumlahFoto: number;
  scope: string;
  exists: boolean;
}> {
  const snapshot = await getFirebaseDb().collection(COLLECTIONS.drafts).doc(draftId).get();
  if (!snapshot.exists) return { jumlahFoto: 0, scope: '', exists: false };
  const data = snapshot.data() || {};
  return {
    jumlahFoto: toNumber(data.jumlahFoto),
    scope: String(data.scope || ''),
    exists: true,
  };
}

