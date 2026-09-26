'use client';

import Image from 'next/image';
import Link from 'next/link';
import Icon from './Icon';
import { useApp } from '@/features/core/AppContext';
import { APP_NAME, APP_TAGLINE, APP_VERSION } from '@/lib/constants';

/**
 * Header aplikasi — seragam untuk semua kategori.
 * Tautan CCTV hanya ditampilkan pada alur pedestrian.
 */
export default function BrandHeader() {
  const { flow, settings, toggleTheme, setShowSettings, online } = useApp();

  return (
    <header className="header">
      <div className="hdr-bar">
        <div className="hdr-start">
          <span className="app-ver">{`${APP_NAME} v${APP_VERSION}`}</span>
          {!online && (
            <span className="net-badge" role="status">
              <Icon name="wifiOff" /> Offline
            </span>
          )}
        </div>
        <div className="hdr-actions">
          {flow === 'pedestrian' && (
            <Link className="hdr-link" href="/cctv" title="Lihat kamera CCTV">
              <Icon name="video" />
              <span>CCTV</span>
            </Link>
          )}
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            title={settings.theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            aria-label={settings.theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
          >
            <Icon name={settings.theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowSettings(true)}
            title="Pengaturan"
            aria-label="Buka pengaturan"
          >
            <Icon name="settings" />
          </button>
        </div>
      </div>

      <div className="logos-row">
        <span className="logo-wrap">
          <Image
            src="/assets/sipedas.png"
            alt="Lambang Linmas"
            width={68}
            height={68}
            priority
          />
        </span>
        <div className="brand-wrap">
          <div className="brand-line">
            <span className="brand-title">{APP_NAME}</span>
            <span className="brand-badge">
              <Icon name="smartphone" /> Mobile
            </span>
          </div>
          <p className="brand-sub">{APP_TAGLINE}</p>
        </div>
      </div>

      <div className="hdr-div" />
    </header>
  );
}
