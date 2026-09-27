'use client';

import { useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light';

export const SETTINGS_KEY = 'sipedas:v5:settings';

/**
 * Membaca preferensi tema dari localStorage.
 * Bawaan mutlak adalah 'dark' kecuali pengguna secara eksplisit memilih 'light'.
 */
export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return 'dark';
    const parsed = JSON.parse(raw);
    return parsed?.theme === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/**
 * Menerapkan tema pada <html> (satu-satunya sumber kebenaran) serta
 * menyinkronkan meta theme-color pada browser.
 *
 * Class TIDAK lagi dipasang pada <body>: saat halaman dimuat penuh,
 * <body> belum ada ketika <head> dieksekusi, sehingga CSS berbasis
 * `body.light-mode` akan gagal match dan tema tampak berkedip saat transisi.
 */
export function applyThemeToDOM(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const isLight = theme === 'light';

  const root = document.documentElement;
  root.classList.toggle('light-mode', isLight);
  // Bersihkan class sisa bila versi lama sempat menempelkannya di <body>.
  document.body?.classList.remove('light-mode');
  root.style.colorScheme = isLight ? 'light' : 'dark';

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', isLight ? '#f5f7fc' : '#080d18');
  }
}

/**
 * Menyimpan tema terpilih ke localStorage tanpa menghapus konfigurasi settings lain.
 */
export function saveStoredTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed.theme = theme;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
  } catch {
    /* Kuota penuh atau mode privat — abaikan */
  }
}

/**
 * Hook reaktif untuk komponen mandiri (seperti CategoryLanding & CCTV)
 * agar tema dapat diubah dan selalu tersinkronisasi otomatis antar halaman/tab.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = getStoredTheme();
    setTheme(current);
    applyThemeToDOM(current);
    setMounted(true);

    const handleSync = () => {
      const updated = getStoredTheme();
      setTheme(updated);
      applyThemeToDOM(updated);
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('themechange', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('themechange', handleSync);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    saveStoredTheme(nextTheme);
    applyThemeToDOM(nextTheme);
    window.dispatchEvent(new Event('themechange'));
  }, [theme]);

  return { theme, toggleTheme, mounted };
}
