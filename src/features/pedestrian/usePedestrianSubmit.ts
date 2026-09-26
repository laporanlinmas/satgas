'use client';

import { useCallback, useState } from 'react';
import { useApp } from '../core/AppContext';
import { adaptiveConcurrency, apiFetch, parallelLimit, withRetry } from '../core/apiClient';
import { formatExifTime } from '../core/exif';
import { esc } from '@/lib/html';
import { MAX_PHOTOS } from '@/lib/constants';
import type { PhotoData } from '../core/types';

/**
 * Alur kirim laporan pedestrian:
 *   1. validasi teks + foto,
 *   2. unggah foto ke Google Drive (paralel per foto),
 *   3. tulis baris laporan + detail foto ke Spreadsheet,
 *   4. hapus draft bila ada, lalu bersihkan perangkat.
 */

const STEPS = [
  { icon: 'file', label: 'Baca teks laporan' },
  { icon: 'cloudUpload', label: 'Unggah foto ke Drive' },
  { icon: 'table', label: 'Tulis ke Spreadsheet' },
  { icon: 'circleCheck', label: 'Selesai' },
];

const MIN_CHARS = 40;

interface PhotoMetaPayload {
  hasGps: boolean;
  lat: number | null;
  lng: number | null;
  datetime: string | null;
  address: string | null;
}

export interface DrivePhotoLink {
  link: string;
  namaFile: string;
  source: 'camera' | 'gallery';
  meta: PhotoMetaPayload;
  folderUrl: string;
}

export function usePedestrianSubmit() {
  const {
    reportText,
    photos,
    activeDraftId,
    setActiveDraftId,
    setReportText,
    showAlert,
    startLoading,
    setProgress,
    stopLoading,
    resetReport,
  } = useApp();
  const [busy, setBusy] = useState(false);

  const validate = useCallback((): string | null => {
    if (reportText.trim().length < MIN_CHARS) {
      return 'Teks laporan belum ditempel atau terlalu pendek.';
    }
    if (!photos.length) return 'Lampirkan minimal 1 foto dokumentasi.';
    if (photos.length > MAX_PHOTOS) return `Maksimal ${MAX_PHOTOS} foto per laporan.`;
    if (photos.some(photo => photo.processing)) return 'Sebagian foto masih diproses.';
    if (photos.some(photo => !photo.data)) return 'Sebagian foto belum selesai disiapkan.';
    return null;
  }, [reportText, photos]);

  const submit = useCallback(async () => {
    if (busy) return;
    const problem = validate();
    if (problem) {
      showAlert('warn', 'Laporan Belum Lengkap', esc(problem));
      return;
    }

    setBusy(true);
    startLoading('submit', 'Mengirim Laporan…', 'Menyiapkan data…', STEPS);
    setProgress(0, 5, 'Mengecek teks laporan…');

    try {
      let done = 0;
      const results = await parallelLimit(
        photos,
        async (index, photo) => {
          const response = await withRetry(
            () =>
              apiFetch<{ linkFile: string; namaFile: string; folderUrl: string }>('/api/pedestrian', {
                method: 'POST',
                timeout: 80_000,
                body: {
                  action: 'uploadFoto',
                  data: {
                    foto: { data: photo.data, mime: photo.mime, source: photo.source },
                    meta: metaOf(photo),
                    laporan: reportText,
                    noFoto: index + 1,
                    jumlahTotal: photos.length,
                  },
                },
              }),
            2,
            600,
          );
          done += 1;
          setProgress(
            1,
            Math.round((done / photos.length) * 75) + 5,
            `Mengunggah foto ${done} dari ${photos.length}…`,
          );
          return {
            link: response.linkFile,
            namaFile: response.namaFile,
            source: photo.source,
            meta: metaOf(photo),
            folderUrl: response.folderUrl,
          } satisfies DrivePhotoLink;
        },
        Math.min(adaptiveConcurrency(4), 4),
      );

      const failed = results.filter((item): item is Error => item instanceof Error);
      if (failed.length) throw failed[0];

      const uploaded = results.filter((item): item is DrivePhotoLink => !(item instanceof Error));
      const folderUrl = uploaded.find(item => item.folderUrl)?.folderUrl || '';

      setProgress(1, 80, `${uploaded.length} foto terunggah ke Drive`);
      setProgress(2, 90, 'Menulis ke Spreadsheet…');

      const response = await withRetry(
        () =>
          apiFetch<{ draftRemoved: boolean }>('/api/pedestrian', {
            method: 'POST',
            timeout: 40_000,
            body: {
              action: 'submitLaporan',
              data: {
                laporan: reportText,
                linkFoto: uploaded.map(({ link, namaFile, source, meta }) => ({
                  link,
                  namaFile,
                  source,
                  meta,
                })),
                folderUrl,
                draftId: activeDraftId,
              },
            },
          }),
        2,
        800,
      );

      if (!response.success) throw new Error(response.message || 'Penulisan spreadsheet gagal.');

      setProgress(3, 100, 'Selesai');
      await new Promise(done => setTimeout(done, 450));
      stopLoading();

      setReportText('');
      setActiveDraftId(null);
      await resetReport({ silent: true });

      showAlert(
        'success',
        'Laporan Terkirim',
        `Laporan beserta <b>${uploaded.length}</b> foto tersimpan di Drive dan Spreadsheet.` +
          (response.draftRemoved ? '<br><small style="color:var(--muted)">Draft di server ikut dihapus.</small>' : ''),
      );
    } catch (error) {
      stopLoading();
      const message = (error as Error).message || 'Terjadi kesalahan saat mengirim.';
      showAlert(
        'error',
        'Gagal Mengirim Laporan',
        `${esc(message)}<br><small style="color:var(--muted)">Data tetap tersimpan di perangkat — tekan KIRIM LAPORAN untuk mencoba lagi.</small>`,
      );
    } finally {
      setBusy(false);
    }
  }, [
    busy, validate, photos, reportText, activeDraftId, setActiveDraftId, setReportText,
    showAlert, startLoading, setProgress, stopLoading, resetReport,
  ]);

  return { submit, busy, problem: validate() };
}

function metaOf(photo: PhotoData): DrivePhotoLink['meta'] {
  return {
    hasGps: Boolean(photo.exif?.gps),
    lat: photo.exif?.gps?.lat ?? null,
    lng: photo.exif?.gps?.lng ?? null,
    datetime: photo.exif ? formatExifTime(photo.exif) : null,
    address: photo.exifAddr?.full || null,
  };
}
