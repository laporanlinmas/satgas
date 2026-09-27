'use client';

import { useCallback, useState } from 'react';
import { useApp } from '../core/AppContext';
import { adaptiveConcurrency, apiFetch, parallelLimit, withRetry } from '../core/apiClient';
import { uploadPhoto, type UploadedAsset } from '../core/uploads';
import { esc } from '@/lib/html';
import { formatDateInput } from '@/lib/format';
import { MAX_PHOTOS } from '@/lib/constants';
import { composeReportAddress } from '../core/watermark';
import type { PhotoData, PhotoMetaPayload } from '../core/types';

/**
 * Alur kirim laporan kategori terstruktur:
 *   1. validasi form,
 *   2. unggah foto (paralel, langsung ke Cloudinary),
 *   3. tulis metadata laporan ke Firebase,
 *   4. bersihkan data lokal bila sukses.
 */

const STEPS = [
  { icon: 'file', label: 'Validasi data laporan' },
  { icon: 'cloudUpload', label: 'Unggah foto ke Cloudinary' },
  { icon: 'database', label: 'Simpan ke Firebase' },
  { icon: 'circleCheck', label: 'Selesai' },
];

function metaOf(photo: PhotoData): PhotoMetaPayload {
  return {
    hasGps: Boolean(photo.exif?.gps),
    lat: photo.exif?.gps?.lat ?? null,
    lng: photo.exif?.gps?.lng ?? null,
    datetime: photo.exif?.dto || photo.exif?.dtd || photo.ts || null,
    address: photo.exifAddr?.full || null,
    source: photo.source,
  };
}

function dataUrlToBlob(dataUrl: string, mime: string): Blob {
  const [header, body] = dataUrl.split(',');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const type = /data:([^;]+)/.exec(header)?.[1] || mime || 'image/jpeg';
  return new Blob([bytes], { type });
}

export function useStructuredSubmit() {
  const {
    category,
    report,
    photos,
    showAlert,
    startLoading,
    setProgress,
    stopLoading,
    resetReport,
  } = useApp();
  const [busy, setBusy] = useState(false);

  const validate = useCallback((): string | null => {
    if (!report.tanggal) return 'Tanggal laporan belum diisi.';
    if (!report.kecamatan) return 'Kecamatan belum dipilih.';
    if (!report.desaKelurahan) return 'Desa / kelurahan belum dipilih.';
    if (!report.detailAlamat.trim()) return 'Detail alamat belum diisi.';
    if (report.lat == null || report.lng == null) {
      return 'Koordinat lokasi belum diisi. Tekan “Ambil koordinat akurat” atau pilih titik di peta.';
    }
    if (!photos.length) return 'Lampirkan minimal 1 foto dokumentasi.';
    if (photos.length > MAX_PHOTOS) return `Maksimal ${MAX_PHOTOS} foto per laporan.`;
    if (photos.some(photo => photo.processing)) return 'Sebagian foto masih diproses.';
    if (photos.some(photo => !photo.data)) return 'Sebagian foto belum selesai disiapkan.';
    return null;
  }, [report, photos]);

  const submit = useCallback(async () => {
    if (busy) return;
    const problem = validate();
    if (problem) {
      showAlert('warn', 'Laporan Belum Lengkap', esc(problem));
      return;
    }

    setBusy(true);
    startLoading('submit', 'Mengirim Laporan…', 'Menyiapkan data…', STEPS);
    setProgress(0, 6, 'Memeriksa data…');

    const requestId = `rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const assets = new Map<string, UploadedAsset>();
    let done = 0;

    try {
      const results = await parallelLimit(
        photos,
        async (index, photo) => {
          const asset = await uploadPhoto({
            file: dataUrlToBlob(photo.data as string, photo.mime),
            scope: category.slug,
            index: index + 1,
            context: {
              kategori: category.name,
              sumber: photo.source,
              exif_gps: photo.exif?.gps ? 'ya' : 'tidak',
            },
          });
          assets.set(photo.id, asset);
          done += 1;
          setProgress(
            1,
            Math.round((done / photos.length) * 72) + 6,
            `Mengunggah foto ${done} dari ${photos.length}…`,
          );
          return asset;
        },
        adaptiveConcurrency(5),
      );

      const failed = results.filter((item): item is Error => item instanceof Error);
      if (failed.length) throw failed[0];

      setProgress(1, 78, `${assets.size} foto terunggah`);

      const response = await withRetry(
        () =>
          apiFetch<{ id: string }>('/api/reports', {
            method: 'POST',
            timeout: 60_000,
            body: {
              requestId,
              kegiatan: category.name,
              tanggal: report.tanggal,
              kecamatan: report.kecamatan,
              desaKelurahan: report.desaKelurahan,
              detailAlamat: report.detailAlamat,
              keterangan: report.keterangan,
              alamatLengkap: composeReportAddress(report),
              lat: report.lat,
              lng: report.lng,
              coordSource: report.coordSource,
              coordAccuracy: report.coordAccuracy,
              photos: photos.map(photo => {
                const asset = assets.get(photo.id);
                const meta = metaOf(photo);
                return {
                  publicId: asset?.publicId,
                  url: asset?.url,
                  mime: photo.mime,
                  sizeKB: photo.sizeKB,
                  source: photo.source,
                  watermarked: photo.watermarked,
                  gps: meta.hasGps ? { lat: meta.lat, lng: meta.lng } : null,
                  address: meta.address,
                  capturedAt: meta.datetime,
                };
              }),
            },
          }),
        3,
        700,
      );

      if (!response.success) throw new Error(response.message || 'Penyimpanan laporan gagal.');

      setProgress(2, 96, 'Laporan tersimpan');
      setProgress(3, 100, 'Selesai');
      await new Promise(done => setTimeout(done, 450));
      stopLoading();
      await resetReport({ silent: true });

      showAlert(
        'success',
        'Laporan Terkirim',
        `Laporan <b>${esc(category.name)}</b> beserta <b>${photos.length}</b> foto berhasil disimpan` +
          `${report.tanggal ? ` untuk tanggal <b>${esc(formatDateInput(report.tanggal))}</b>` : ''}.`,
      );
    } catch (error) {
      stopLoading();
      const message = (error as Error).message || 'Terjadi kesalahan saat mengirim.';
      showAlert(
        'error',
        'Gagal Mengirim Laporan',
        `${esc(message)}<br><small style="color:var(--muted)">Foto tetap tersimpan di perangkat — tekan KIRIM LAPORAN untuk mencoba lagi.</small>`,
      );
    } finally {
      setBusy(false);
    }
  }, [
    busy, validate, photos, category, report, showAlert, startLoading, setProgress, stopLoading, resetReport,
  ]);

  return { submit, busy, problem: validate() };
}
