import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#080d18',
};

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_TAGLINE,
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/assets/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/assets/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/assets/favicon.ico', sizes: '16x16', type: 'image/x-icon' },
    ],
    apple: [{ url: '/assets/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/assets/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: 'black-translucent',
  },
  other: { 'mobile-web-app-capable': 'yes' },
};

/**
 * Skrip kecil yang dipakai sebelum hydration agar tema tidak berkedip.
 * Bawaan mutlak: 'dark' (gelap). Mode terang hanya aktif bila dipilih eksplisit.
 */
const themeBootstrap = `(function(){try{var r=localStorage.getItem('sipedas:v5:settings');var t=r?JSON.parse(r).theme:null;var light=t==='light';var d=document.documentElement;d.classList.toggle('light-mode',light);if(document.body)document.body.classList.toggle('light-mode',light);d.style.colorScheme=light?'light':'dark';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className={inter.variable}>
        {children}
      </body>
    </html>
  );
}
