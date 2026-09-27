'use client';

import Image from 'next/image';
import CategoryCard from './CategoryCard';
import Icon from './Icon';
import { APP_NAME, APP_TAGLINE, CATEGORIES } from '@/lib/constants';
import { useTheme } from '@/lib/theme';

/**
 * Menu utama: enam kategori laporan.
 * Dilengkapi logo, branding, dan tombol toggle tema.
 */
export default function CategoryLanding() {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <main className="landing">
      {/* Ornamen batik dekoratif - menyatu dengan gradient */}
      <div className="landing-ornament landing-ornament--tl" aria-hidden="true" />
      <div className="landing-ornament landing-ornament--br" aria-hidden="true" />
      <div className="landing-wash" aria-hidden="true" />

      <div className="landing-header">
        <div className="landing-header-actions">
          <button
            type="button"
            className="icon-btn theme-toggle-btn"
            onClick={toggleTheme}
            title={mounted && theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'}
            aria-label={mounted && theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'}
          >
            <Icon name={mounted && theme === 'light' ? 'moon' : 'sun'} />
          </button>
        </div>
      </div>

      <div className="landing-hero">
        <div className="landing-brand">
          <div className="landing-logo">
            <Image
              src="/assets/icon-512.png"
              alt="Logo SIPEDAS"
              width={72}
              height={72}
              priority
            />
          </div>
          <div className="landing-brand-text">
            <div className="landing-brand-line">
              <h1 className="landing-title">{APP_NAME}</h1>
              <span className="landing-badge">
                <Icon name="smartphone" /> Mobile
              </span>
            </div>
            <p className="landing-subtitle">{APP_TAGLINE.toUpperCase()}</p>
          </div>
        </div>
        <p className="landing-kicker">{APP_TAGLINE}</p>
        <h2 className="landing-heading">Pilih jenis laporan</h2>
        <p className="landing-intro">
          Pilih Program Satgas Linmas di bawah ini untuk mulai membuat laporan.
        </p>
      </div>

      <ul className="landing-grid">
        {CATEGORIES.map(category => (
          <li key={category.slug}>
            <CategoryCard category={category} />
          </li>
        ))}
      </ul>

    </main>
  );
}
