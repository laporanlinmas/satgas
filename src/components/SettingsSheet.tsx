'use client';

import { useState, type ReactNode } from 'react';
import Icon from './Icon';
import { useApp } from '@/features/core/AppContext';
import { apiFetch } from '@/features/core/apiClient';
import {
  APP_CONTACT_WA,
  APP_NAME,
  APP_TAGLINE,
  APP_VERSION,
  APP_WILAYAH,
  DEVELOPER_NAME,
  DEVELOPER_PHOTO,
  DEVELOPER_ROLE,
} from '@/lib/constants';
import { stampMediumWib } from '@/lib/format';
import { defaultLocation, type ServerConfig } from '@/features/core/types';

type Section = 'tampilan' | 'foto' | 'lokasi' | 'panduan' | 'sistem' | null;

function Toggle({
  icon,
  tone,
  label,
  description,
  checked,
  onChange,
}: {
  icon: ReactNode;
  tone?: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span className="toggle-info">
        <span className="toggle-ico" style={tone ? { color: `var(--${tone})` } : undefined}>
          {icon}
        </span>
        <span className="toggle-text">
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
      />
      <span className={`switch${checked ? ' on' : ''}`} aria-hidden="true">
        <span className="switch-knob" />
      </span>
    </label>
  );
}

function Group({
  title,
  id,
  open,
  onToggle,
  icon,
  children,
}: {
  title: string;
  id: Exclude<Section, null>;
  open: Section;
  onToggle: (id: Exclude<Section, null>) => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  const isOpen = open === id;
  return (
    <div className="set-group">
      <button
        type="button"
        className={`set-collapse${isOpen ? ' open' : ''}`}
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
      >
        {icon}
        <span>{title}</span>
        <Icon name="chevronDown" className="collapse-arrow" />
      </button>
      <div className={`collapse-body${isOpen ? ' open' : ''}`}>
        <div>{children}</div>
      </div>
    </div>
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`status-pill${ok ? ' ok' : ' off'}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
}

/** Panel pengaturan yang sama untuk seluruh kategori. */
export default function SettingsSheet() {
  const {
    showSettings,
    setShowSettings,
    settings,
    updateSettings,
    category,
    flow,
    location,
    updateLocation,
    coords,
    updateCoords,
  } = useApp();
  const [open, setOpen] = useState<Section>(null);
  const [health, setHealth] = useState<ServerConfig | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const toggle = (id: Exclude<Section, null>) => setOpen(current => (current === id ? null : id));

  const runHealthCheck = async () => {
    if (checking) return;
    setChecking(true);
    setHealthError(null);
    try {
      const result = await apiFetch<{ checks: Record<string, boolean | string> }>('/api/health', {
        timeout: 10_000,
      });
      setHealth({
        cloudinary: Boolean(result.checks.cloudinary),
        firebase: Boolean(result.checks.firebase),
        google: Boolean(result.checks.googleOAuth || result.checks.googleServiceAccount),
        sheet: Boolean(result.checks.sheet),
        drive: Boolean(result.checks.driveFolder),
        appsScript: Boolean(result.checks.appsScript),
      });
    } catch (error) {
      setHealthError((error as Error).message);
      setHealth(null);
    } finally {
      setChecking(false);
    }
  };

  const storageLabel =
    flow === 'pedestrian'
      ? 'Teks laporan ditempel dari WhatsApp, foto dikirim ke Google Drive, data ditulis ke Spreadsheet.'
      : 'Data laporan disimpan ke Firebase Firestore, foto diunggah ke Cloudinary.';

  return (
    <div
      className={`sheet-overlay${showSettings ? ' show' : ''}`}
      onClick={event => {
        if (event.target === event.currentTarget) setShowSettings(false);
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Pengaturan">
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>
            <Icon name="settings" /> Pengaturan
          </h2>
          <button
            type="button"
            className="sheet-close"
            onClick={() => setShowSettings(false)}
            aria-label="Tutup pengaturan"
          >
            <Icon name="x" />
          </button>
        </div>

        <div className="sheet-body">
          <div className="set-card">
            <span className="set-card-ico">
              <Icon name={flow === 'pedestrian' ? 'shield' : 'file'} />
            </span>
            <div>
              <strong>{category.name}</strong>
              <p>{storageLabel}</p>
            </div>
          </div>

          <Group
            title="Tampilan"
            id="tampilan"
            open={open}
            onToggle={toggle}
            icon={<Icon name={settings.theme === 'dark' ? 'moon' : 'sun'} />}
          >
            <Toggle
              icon={<Icon name={settings.theme === 'light' ? 'sun' : 'moon'} />}
              tone="gold"
              label={settings.theme === 'light' ? 'Mode Terang' : 'Mode Gelap (Bawaan)'}
              description={settings.theme === 'light' ? 'Beralih ke mode terang (default: gelap)' : 'Beralih ke mode terang'}
              checked={settings.theme === 'light'}
              onChange={light => updateSettings({ theme: light ? 'light' : 'dark' })}
            />
            <Toggle
              icon={<Icon name="map" />}
              tone="green"
              label="Peta lokasi foto"
              description="Tampilkan peta dari koordinat EXIF atau OCR"
              checked={settings.minimap}
              onChange={minimap => updateSettings({ minimap })}
            />
          </Group>

          <Group
            title="Fitur Foto"
            id="foto"
            open={open}
            onToggle={toggle}
            icon={<Icon name="camera" />}
          >
            <Toggle
              icon={<Icon name="camera" />}
              tone="gold"
              label="Watermark foto kamera"
              description="Cap nama, waktu, alamat, dan QR lokasi"
              checked={settings.wmCam}
              onChange={wmCam => updateSettings({ wmCam })}
            />
            <Toggle
              icon={<Icon name="images" />}
              tone="blue"
              label="Watermark foto galeri"
              description="Cap otomatis untuk foto dari galeri"
              checked={settings.wmGal}
              onChange={wmGal => updateSettings({ wmGal })}
            />
            <Toggle
              icon={<Icon name="search" />}
              tone="amber"
              label="Deteksi lokasi foto galeri (OCR)"
              description="Baca koordinat dari teks pada gambar"
              checked={settings.ocrGal}
              onChange={ocrGal => updateSettings({ ocrGal })}
            />
          </Group>

          {flow === 'pedestrian' && (
            <Group
              title="Lokasi Manual"
              id="lokasi"
              open={open}
              onToggle={toggle}
              icon={<Icon name="mapPin" />}
            >
              <p className="set-hint">
                Dipakai sebagai cap lokasi pada foto galeri yang tidak memiliki data GPS.
              </p>
              <div className="field-list">
                <MiniField
                  label="Jalan / gang"
                  value={location.jalan}
                  placeholder="Nama jalan atau gang"
                  onChange={jalan => updateLocation({ jalan })}
                />
                <MiniField
                  label="No / dukuh"
                  value={location.nodukuh}
                  placeholder="No. 12 / Dukuh Krajan"
                  onChange={nodukuh => updateLocation({ nodukuh })}
                />
                <MiniField
                  label="Desa / kelurahan"
                  value={location.desa}
                  onChange={desa => updateLocation({ desa })}
                />
                <MiniField
                  label="Kecamatan"
                  value={location.kec}
                  onChange={kec => updateLocation({ kec })}
                />
                <MiniField
                  label="Kabupaten"
                  value={location.kab}
                  onChange={kab => updateLocation({ kab })}
                />
                <MiniField
                  label="Provinsi"
                  value={location.prov}
                  onChange={prov => updateLocation({ prov })}
                />
                <MiniField
                  label="Latitude"
                  value={coords.lat}
                  placeholder="-7.865900"
                  inputMode="decimal"
                  onChange={lat => updateCoords({ lat })}
                />
                <MiniField
                  label="Longitude"
                  value={coords.lng}
                  placeholder="111.464900"
                  inputMode="decimal"
                  onChange={lng => updateCoords({ lng })}
                />
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  updateLocation({ ...defaultLocation });
                  updateCoords({ lat: '', lng: '' });
                }}
              >
                <Icon name="refresh" /> Reset semua field lokasi
              </button>
            </Group>
          )}

          <Group
            title="Panduan Penggunaan"
            id="panduan"
            open={open}
            onToggle={toggle}
            icon={<Icon name="file" />}
          >
            <ol className="guide">
              {(flow === 'pedestrian' ? PEDESTRIAN_GUIDE : STRUCTURED_GUIDE).map(step => (
                <li key={step.title}>
                  <span className="guide-num">{step.n}</span>
                  <span className="guide-text">
                    <strong>{step.title}</strong>
                    <p>{step.desc}</p>
                  </span>
                </li>
              ))}
            </ol>
          </Group>

          <Group
            title="Info Sistem"
            id="sistem"
            open={open}
            onToggle={toggle}
            icon={<Icon name="info" />}
          >
            <dl className="info-list">
              <div>
                <dt>Aplikasi</dt>
                <dd>
                  {APP_NAME} · {APP_VERSION}
                </dd>
              </div>
              <div>
                <dt>Alur laporan</dt>
                <dd>{category.name}</dd>
              </div>
              <div>
                <dt>Satgas</dt>
                <dd>Satgas Linmas</dd>
              </div>
              <div>
                <dt>Wilayah</dt>
                <dd>{APP_WILAYAH}</dd>
              </div>
              <div>
                <dt>Waktu server</dt>
                <dd>{stampMediumWib()}</dd>
              </div>
              <div>
                <dt>Status server</dt>
                <dd>
                  {health ? (
                    <span className="health-row">
                      <Status ok={health.firebase} label="Firebase" />
                      <Status ok={health.cloudinary} label="Cloudinary" />
                      <Status ok={health.sheet} label="Sheets" />
                      <Status ok={health.drive} label="Drive" />
                    </span>
                  ) : healthError ? (
                    <span className="health-error">{healthError}</span>
                  ) : (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={runHealthCheck}
                      disabled={checking}
                    >
                      {checking ? 'Memeriksa…' : 'Periksa koneksi'}
                    </button>
                  )}
                </dd>
              </div>
            </dl>

            <a
              className="wa-link"
              href={`https://wa.me/${APP_CONTACT_WA}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="message" /> Hubungi WhatsApp
            </a>

            <div className="author">
              <img
                src={DEVELOPER_PHOTO}
                alt={DEVELOPER_NAME}
                width={52}
                height={52}
                loading="lazy"
              />
              <div>
                <strong>{DEVELOPER_NAME}</strong>
                <small>{DEVELOPER_ROLE}</small>
              </div>
            </div>

            <p className="set-footnote">{APP_TAGLINE}</p>
          </Group>
        </div>
      </div>
    </div>
  );
}

function MiniField({
  label,
  value,
  placeholder,
  inputMode,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  inputMode?: 'decimal' | 'text';
  onChange: (value: string) => void;
}) {
  return (
    <label className="mini-field">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

const STRUCTURED_GUIDE = [
  {
    n: 1,
    title: 'Lengkapi data lokasi',
    desc: 'Pilih tanggal, kecamatan, lalu desa atau kelurahan. Kotak pencarian tersedia pada setiap kolom.',
  },
  {
    n: 2,
    title: 'Ambil foto dokumentasi',
    desc: 'Gunakan Kamera agar EXIF GPS terbaca. Sistem menempel watermark alamat, waktu, koordinat, dan QR lokasi.',
  },
  {
    n: 3,
    title: 'Kirim laporan',
    desc: 'Foto dikirim langsung ke Cloudinary, lalu metadata laporan disimpan ke Firebase.',
  },
  {
    n: 4,
    title: 'Tunggu konfirmasi',
    desc: 'Layar progres menampilkan tahap unggah dan penyimpanan. Foto tetap aman di perangkat bila koneksi terputus.',
  },
];

const PEDESTRIAN_GUIDE = [
  {
    n: 1,
    title: 'Tempel teks laporan',
    desc: 'Salin teks laporan patroli dari WhatsApp. Pastikan memuat Patroli, Hari, Tanggal, Identitas Pelanggaran, Personil, dan Danru.',
  },
  {
    n: 2,
    title: 'Ambil foto melalui Kamera',
    desc: 'Pastikan GPS aktif. Sistem membaca EXIF, mencari nama jalan, lalu membuat watermark beserta QR lokasi.',
  },
  {
    n: 3,
    title: 'Simpan sebagai draft bila perlu',
    desc: 'Tombol Simpan Draft memindahkan foto dan teks ke server agar bisa dilanjutkan dari perangkat lain.',
  },
  {
    n: 4,
    title: 'Kirim laporan',
    desc: 'Foto diunggah ke Google Drive per tanggal, data ditulis ke Spreadsheet, dan draft dihapus otomatis.',
  },
];
