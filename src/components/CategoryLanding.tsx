'use client';

import CategoryCard from './CategoryCard';
import Icon from './Icon';
import { APP_NAME, APP_TAGLINE, APP_VERSION, APP_WILAYAH, CATEGORIES } from '@/lib/constants';
import { useTheme } from '@/lib/theme';

/**
 * Menu utama: enam kategori laporan.
 * Dilengkapi topbar dengan info aplikasi dan tombol toggle tema (Mode Gelap / Terang).
 */
export default function CategoryLanding() {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <main className="landing">
      <div className="landing-topbar">
        <div className="landing-topbar-start">
          <span className="landing-mark">S</span>
          <div className="landing-app-info">
            <span className="app-ver">{`${APP_NAME} v${APP_VERSION}`}</span>
            <span className="landing-badge-tag">SATGAS LINMAS</span>
          </div>
        </div>

        <div className="landing-topbar-actions">
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
        <p className="landing-kicker">{APP_TAGLINE}</p>
        <h1>Pilih jenis laporan</h1>
      </div>

      <ul className="landing-grid">
        {CATEGORIES.map(category => (
          <li key={category.slug}>
            <CategoryCard category={category} />
          </li>
        ))}
      </ul>

      <footer className="landing-foot">
        <span>{APP_NAME}</span>
        <span aria-hidden="true">•</span>
        <span>{APP_WILAYAH}</span>
      </footer>
    </main>
  );
}
