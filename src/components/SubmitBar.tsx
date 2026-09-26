'use client';

import Icon from './Icon';
import { useApp } from '@/features/core/AppContext';

export interface SubmitBarProps {
  onSubmit: () => void;
  disabled?: boolean;
  busy?: boolean;
  label?: string;
  /** Slot kiri (mis. tombol draft pedestrian). */
  children?: React.ReactNode;
  /** Catatan kecil di bawah tombol. */
  hint?: string;
}

/** Bilah aksi bawah yang menempel: kirim laporan + reset. */
export default function SubmitBar({
  onSubmit,
  disabled = false,
  busy = false,
  label = 'KIRIM LAPORAN',
  children,
  hint,
}: SubmitBarProps) {
  const {
    showConfirm,
    resetReport,
    report,
    reportText,
    flow,
    category,
    photoCount,
    isProcessing,
  } = useApp();

  const reset = () =>
    showConfirm({
      title: 'Reset Laporan',
      message:
        flow === 'pedestrian'
          ? 'Hapus semua foto dan teks laporan ini? Draft di server tidak terpengaruh.'
          : 'Hapus semua foto dan data laporan ini?',
      onConfirm: () => void resetReport(),
    });

  const blocked = !photoCount || isProcessing;

  return (
    <div className="submit-bar">
      <div className="submit-inner">
        {children}
        <button
          type="button"
          className="btn-reset"
          onClick={reset}
          title="Reset laporan"
          aria-label="Reset laporan"
        >
          <Icon name="trash" />
        </button>
        <button
          type="button"
          className="btn-submit"
          onClick={onSubmit}
          disabled={disabled || busy || blocked}
        >
          {busy ? <Icon name="loader" className="spin" /> : <Icon name="send" />}
          {busy ? 'MENGIRIMAN…' : label}
        </button>
      </div>
      <p className="submit-hint">{hint}</p>
      <p className="submit-summary">
        <span>
          {category.name} · {flow === 'pedestrian' ? 'Google Drive + Spreadsheet' : 'Firebase + Cloudinary'}
        </span>
        <span>
          {flow === 'pedestrian'
            ? `${reportText.trim().length.toLocaleString('id-ID')} karakter · ${photoCount} foto`
            : `${report.tanggal ? 'tanggal terisi' : 'tanggal kosong'} · ${photoCount} foto`}
        </span>
      </p>
    </div>
  );
}
