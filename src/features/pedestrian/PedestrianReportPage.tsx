'use client';

import Link from 'next/link';
import Icon from '@/components/Icon';
import BrandHeader from '@/components/BrandHeader';
import Modals from '@/components/Modals';
import SettingsSheet from '@/components/SettingsSheet';
import PhotoManager from '@/components/PhotoManager';
import SubmitBar from '@/components/SubmitBar';
import PedestrianForm from './PedestrianForm';
import DraftSheet from './DraftSheet';
import { useDraftManager } from './useDraftManager';
import { usePedestrianSubmit } from './usePedestrianSubmit';
import { usePedestrianWatermarkContext } from './watermarkContext';
import { useApp } from '../core/AppContext';

/** Halaman laporan pedestrian: tempel teks + foto → Google Drive + Spreadsheet. */
export default function PedestrianReportPage() {
  const { category, activeDraftId, isProcessing, photoCount } = useApp();
  const buildContext = usePedestrianWatermarkContext();
  const drafts = useDraftManager();
  const { submit, busy, problem } = usePedestrianSubmit();

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

        <div className="form-grid">
          <PedestrianForm className="slot-form" />
          <PhotoManager
            className="slot-photos"
            buildContext={buildContext}
            cameraNote="EXIF, QR lokasi, watermark"
            galleryNote="Kompresi + watermark lokasi manual"
          >
            <div className="draft-row">
              <button
                type="button"
                className="btn-secondary"
                onClick={drafts.saveDraft}
                disabled={drafts.saving || busy}
              >
                {drafts.saving ? (
                  <>
                    <Icon name="loader" className="spin" /> Menyimpan…
                  </>
                ) : (
                  <>
                    <Icon name="cloudUpload" /> Simpan Draft
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={drafts.openSheet}
                disabled={busy}
              >
                <Icon name="cloudDownload" /> Draft
                {activeDraftId ? <span className="dot-pill" title="Ada draft aktif" /> : null}
              </button>
            </div>
          </PhotoManager>
        </div>

        <SubmitBar
          onSubmit={submit}
          busy={busy}
          disabled={photoCount === 0 || isProcessing}
          label="KIRIM KE DRIVE & SHEET"
          hint={problem ?? 'Foto diunggah ke Google Drive, laporan ditulis ke Spreadsheet.'}
        />
      </div>

      <SettingsSheet />
      <DraftSheet
        open={drafts.sheetOpen}
        loading={drafts.listing}
        error={drafts.listError}
        drafts={drafts.drafts}
        removing={drafts.removing}
        onClose={drafts.closeSheet}
        onLoad={drafts.loadDraft}
        onRemove={drafts.removeDraft}
      />
      <Modals />
    </div>
  );
}
