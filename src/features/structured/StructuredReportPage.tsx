'use client';

import Link from 'next/link';
import Icon from '@/components/Icon';
import BrandHeader from '@/components/BrandHeader';
import Modals from '@/components/Modals';
import SettingsSheet from '@/components/SettingsSheet';
import PhotoManager from '@/components/PhotoManager';
import SubmitBar from '@/components/SubmitBar';
import MapPickerModal from '@/components/MapPickerModal';
import StructuredForm, { useStructuredWatermarkContext } from './StructuredForm';
import { useStructuredSubmit } from './useStructuredSubmit';
import { useApp } from '../core/AppContext';

/** Halaman laporan kategori terstruktur: form + foto → Firebase + Cloudinary. */
export default function StructuredReportPage() {
  const { category, photoCount, isProcessing } = useApp();
  const buildContext = useStructuredWatermarkContext();
  const { submit, busy, problem } = useStructuredSubmit();

  return (
    <div className="shell">
      <div className="shell-inner">
        <BrandHeader />

        <div className="page-bar">
          <Link className="back-link" href="/">
            <Icon name="arrowLeft" /> Menu kategori
          </Link>
          <span className="page-title">{category.name}</span>
        </div>

        {/* Di mobile foto tampil lebih dulu, form menyusul (lihat .form-grid--photos-first). */}
        <div className="form-grid form-grid--photos-first">
          <StructuredForm className="slot-form" />
          <PhotoManager
            className="slot-photos"
            buildContext={buildContext}
            cameraNote="EXIF, QR lokasi, watermark"
            galleryNote="Kompresi + watermark"
          />
        </div>

        <SubmitBar
          onSubmit={submit}
          busy={busy}
          disabled={photoCount === 0 || isProcessing}
          label="KIRIM LAPORAN"
          hint={problem ?? 'Foto dikirim ke Cloudinary, data laporan disimpan di Firebase.'}
        />
      </div>

      <SettingsSheet />
      <Modals />
      <MapPickerModal />
    </div>
  );
}
