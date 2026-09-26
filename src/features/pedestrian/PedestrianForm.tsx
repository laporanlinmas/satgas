'use client';

import { useMemo } from 'react';
import Icon from '@/components/Icon';
import { useApp } from '../core/AppContext';
import { esc } from '@/lib/html';
import { parseReport, REQUIRED_FIELDS, FIELD_LABELS } from '@/lib/pedestrianParser';

/** Panjang minimum teks agar dianggap sebagai laporan yang layak. */
const MIN_CHARS = 40;

/**
 * Formulir pedestrian: satu kolom tempel teks (satu-satunya isian wajib
 * selain foto) plus panel pemeriksaan bagian agar pengguna tahu bagian mana
 * yang belum terbaca sistem sebelum mengirim.
 */
export default function PedestrianForm({ className = '' }: { className?: string }) {
  const { reportText, setReportText } = useApp();

  const { checks, missing } = useMemo(() => {
    const parsed = parseReport(reportText);
    return {
      checks: REQUIRED_FIELDS.map(field => ({ field, ok: !parsed.missing.includes(field) })),
      missing: parsed.missing,
    };
  }, [reportText]);

  const length = reportText.trim().length;
  const longEnough = length >= MIN_CHARS;

  return (
    <section className={className ? `card ${className}` : 'card'}>
      <div className="card-head">
        <span className="card-ico tone-blue">
          <Icon name="file" />
        </span>
        <h3>Teks Laporan Patroli</h3>
        <span className="badge">Wajib</span>
      </div>

      <div className="card-body">
        <textarea
          className="paste-field"
          value={reportText}
          onChange={event => setReportText(event.target.value)}
          placeholder={
            'Tempel teks laporan patroli dari WhatsApp di sini.\n\nPatroli Linmas Pedestrian di Jl. Ahmad Yani Km 2\nHari : Sabtu\nTanggal : 26 September 2026\nIdentitas Pelanggaran : ...\nPersonil yang terlibat : (...)\nDanru 12 (Nama Danru)'
          }
          rows={10}
          spellCheck={false}
          aria-label="Teks laporan patroli"
        />

        <div className="paste-meta">
          <span className={longEnough ? 'ok' : ''}>
            {length.toLocaleString('id-ID')} karakter
            {longEnough ? ' · siap diproses' : ` · minimal ${MIN_CHARS}`}
          </span>
          {reportText && (
            <button type="button" className="link-btn" onClick={() => setReportText('')}>
              <Icon name="x" /> Bersihkan
            </button>
          )}
        </div>

        <ul className="check-grid">
          {checks.map(check => (
            <li
              key={check.field}
              className={`check-pill${check.ok ? ' ok' : ''}`}
              aria-label={`${FIELD_LABELS[check.field]}: ${check.ok ? 'terbaca' : 'belum terbaca'}`}
            >
              <Icon name={check.ok ? 'check' : 'circleAlert'} />
              {FIELD_LABELS[check.field]}
            </li>
          ))}
        </ul>

        {reportText.trim() && missing.length > 0 && (
          <p className="hint-warn">
            <Icon name="triangleAlert" />
            <span>
              Bagian belum terbaca: <b>{esc(missing.map(field => FIELD_LABELS[field]).join(', '))}</b>.
              Lengkapi sebelum mengirim agar tidak tertolak server.
            </span>
          </p>
        )}

        <p className="hint-info">
          <Icon name="info" />
          <span>
            Foto dikirim ke Google Drive per tanggal, data laporan ditulis ke Spreadsheet. Minimal 1 foto
            wajib dilampirkan.
          </span>
        </p>
      </div>
    </section>
  );
}
