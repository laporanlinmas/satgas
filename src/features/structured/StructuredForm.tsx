'use client';

import { useLayoutEffect, useRef } from 'react';
import Icon from '@/components/Icon';
import { useApp } from '../core/AppContext';
import DatePicker from '@/components/ui/DatePicker';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { desaPonorogo, kecamatanPonorogo } from '@/lib/ponorogo';
import { composeReportAddress, type WatermarkContext } from '../core/watermark';
import { useAccurateLocation } from '../core/location';
import { GPS_MAX_ACCURACY_M } from '@/lib/constants';
import type { BuildContext, ProcessContextInput } from '../core/usePhotoProcessor';
import type { GeoAddress } from '../core/types';

/**
 * Konteks watermark untuk kategori terstruktur.
 *
 * Alamat selalu memakai isian form yang dirangkai lengkap
 * (`detail, kelurahan, kecamatan, Ponorogo, Jawa Timur, Indonesia`). Koordinat
 * diambil dari EXIF foto bila ada; jika tidak, memakai koordinat yang dipilih
 * pengguna (GPS atau peta) dan ditandai sebagai alamat manual.
 */
export function useStructuredWatermarkContext(): BuildContext {
  const { report, category } = useApp();

  return (input: ProcessContextInput) => {
    const manual =
      report.lat != null && report.lng != null ? { lat: report.lat, lng: report.lng } : null;
    const exifGps = input.exif?.gps || null;
    return buildWatermark(category.name, input, composeReportAddress(report), exifGps, manual);
  };
}

function buildWatermark(
  program: string,
  input: ProcessContextInput,
  fallback: string,
  exifGps: { lat: number; lng: number } | null,
  manual: { lat: number; lng: number } | null,
): WatermarkContext {
  return {
    program,
    unit: '',
    fallbackAddress: fallback,
    gps: exifGps || manual,
    manualGps: !exifGps && Boolean(manual),
    address: input.address as GeoAddress | null,
    capturedAt: input.capturedAt,
  };
}

/** Formulir terstruktur: kategori terkunci + tanggal + lokasi + keterangan. */
export default function StructuredForm({ className = '' }: { className?: string }) {
  const { report, updateReport, category, openMapPicker } = useApp();
  const { busy, error, locate } = useAccurateLocation();

  const onLocate = async () => {
    try {
      const found = await locate();
      updateReport({
        lat: Number(found.lat.toFixed(6)),
        lng: Number(found.lng.toFixed(6)),
        coordSource: 'gps',
        coordAccuracy: Number(found.accuracy.toFixed(1)),
      });
    } catch {
      /* pesan sudah tersimpan di error */
    }
  };

  const onHighAccuracyLocate = async () => {
    try {
      const found = await locate();
      updateReport({
        lat: Number(found.lat.toFixed(6)),
        lng: Number(found.lng.toFixed(6)),
        coordSource: 'gps',
        coordAccuracy: Number(found.accuracy.toFixed(1)),
      });
    } catch {
      /* pesan sudah tersimpan di error */
    }
  };

  const hasCoords = report.lat != null && report.lng != null;
  const weakAccuracy =
    report.coordSource === 'gps' &&
    report.coordAccuracy != null &&
    report.coordAccuracy > GPS_MAX_ACCURACY_M;

  return (
    <section className={className ? `card ${className}` : 'card'}>
      <div className="card-head">
        <span className="card-ico tone-blue">
          <Icon name="file" />
        </span>
        <h3>Data Laporan</h3>
        <span className="badge">Wajib</span>
      </div>

      <div className="card-body">
        <div className="field-grid">
          <div className="form-field">
            <span>Kategori laporan</span>
            <div className="locked-field">
              <Icon name="file" />
              <strong>{category.name}</strong>
            </div>
          </div>

          <DatePicker
            value={report.tanggal}
            onChange={value => updateReport({ tanggal: value })}
          />

          <SearchableSelect
            label="Kecamatan"
            value={report.kecamatan}
            options={kecamatanPonorogo}
            placeholder="Cari kecamatan"
            onChange={value => updateReport({ kecamatan: value, desaKelurahan: '' })}
          />

          <SearchableSelect
            label="Desa / Kelurahan"
            value={report.desaKelurahan}
            options={desaPonorogo[report.kecamatan] || []}
            placeholder={report.kecamatan ? 'Cari desa atau kelurahan' : 'Pilih kecamatan dahulu'}
            disabled={!report.kecamatan}
            onChange={value => updateReport({ desaKelurahan: value })}
          />

          <div className="form-field form-field-wide">
            <div className="form-field-head row">
              <span>
                Detail alamat <b>*</b>
              </span>
              <div className="btn-group">
                <button
                  type="button"
                  className="geo-btn"
                  onClick={onLocate}
                  disabled={busy}
                  title="Ambil koordinat GPS akurat dari perangkat"
                >
                  <Icon name={busy ? 'loader' : 'locate'} className={busy ? 'spin' : ''} />
                  {busy ? 'Mengambil…' : 'Ambil koordinat akurat'}
                </button>

                <button
                  type="button"
                  className="geo-btn geo-btn--high"
                  onClick={onHighAccuracyLocate}
                  disabled={busy}
                  title="Ambil koordinat akurat high (disimpan ke Firebase)"
                >
                  <Icon name="locate" className={busy ? 'spin' : ''} />
                  {busy ? 'Mengambil…' : 'Akurat High'}
                </button>
              </div>
            </div>

            <AutoTextarea
              value={report.detailAlamat}
              placeholder="Nama jalan, nomor, dusun, atau patokan"
              onChange={value => updateReport({ detailAlamat: value })}
            />

            {hasCoords && (
              <div className="coord-row">
                <Icon name="mapPin" />
                <span className="coord-val mono">
                  {report.lat!.toFixed(6)}, {report.lng!.toFixed(6)}
                </span>
                <span
                  className={`coord-src${weakAccuracy ? ' weak' : ''}`}
                >
                  {report.coordSource === 'gps'
                    ? `GPS${report.coordAccuracy != null ? ` ±${Math.round(report.coordAccuracy)} m` : ''}`
                    : 'Pilih dari peta'}
                </span>
                <button
                  type="button"
                  className="coord-map-btn"
                  onClick={openMapPicker}
                  title="Cek dan koreksi koordinat di peta"
                >
                  <Icon name="map" /> Peta
                </button>
              </div>
            )}

            {error && (
              <p className="hint-warn">
                <Icon name="triangleAlert" />
                <span>{error}</span>
              </p>
            )}

            {weakAccuracy && (
              <p className="hint-warn">
                <Icon name="triangleAlert" />
                <span>
                  Akurasi GPS di bawah {GPS_MAX_ACCURACY_M} m — buka <b>Peta</b> untuk mengoreksi
                  titik lokasi.
                </span>
              </p>
            )}

            {!hasCoords && !error && (
              <p className="hint-info">
                <Icon name="info" />
                <span>
                  Koordinat dipakai pada cap lokasi foto galeri dan ikut dikirim ke Firebase. Tekan
                  “Ambil koordinat akurat”, lalu cek/koreksi lagi lewat <b>Peta</b>.
                </span>
              </p>
            )}
          </div>

          <label className="form-field form-field-wide">
            <span>
              Keterangan <small>(opsional)</small>
            </span>
            <AutoTextarea
              value={report.keterangan}
              placeholder="Catatan tambahan bila diperlukan"
              onChange={value => updateReport({ keterangan: value })}
            />
          </label>
        </div>
      </div>
    </section>
  );
}


function AutoTextarea({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.max(element.scrollHeight, 52)}px`;
  };

  useLayoutEffect(resize, [value]);

  return (
    <textarea
      ref={ref}
      className="auto-field"
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={event => {
        onChange(event.target.value);
        resize();
      }}
    />
  );
}
