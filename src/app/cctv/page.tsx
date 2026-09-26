import type { Metadata } from 'next';
import Link from 'next/link';
import Icon from '@/components/Icon';

export const metadata: Metadata = {
  title: 'CCTV',
  description: 'Pantau kamera CCTV wilayah melalui SIPEDAS.',
  robots: { index: false, follow: false },
};

function resolveCctvUrl(): string {
  const raw = process.env.NEXT_PUBLIC_CCTV_URL || 'https://sipedasview.vercel.app/';
  try {
    const url = new URL(raw);
    return url.toString();
  } catch {
    return 'https://sipedasview.vercel.app/';
  }
}

export default function CctvPage() {
  const src = resolveCctvUrl();
  const origin = (() => {
    try {
      return new URL(src).origin;
    } catch {
      return src;
    }
  })();

  return (
    <main className="viewer">
      <div className="viewer-bar">
        <Link className="back-link solid" href="/pedestrian">
          <Icon name="arrowLeft" /> Kembali
        </Link>
        <span className="viewer-title">
          <Icon name="video" /> CCTV
        </span>
        <a className="btn-secondary" href={src} target="_blank" rel="noreferrer">
          <Icon name="externalLink" /> Buka luar
        </a>
      </div>
      <div className="viewer-frame">
        <iframe
          src={src}
          title="Live CCTV"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          loading="lazy"
        />
      </div>
      <p className="viewer-note">
        Sumber: <span className="mono">{origin}</span> — tautan dapat diubah melalui variabel lingkungan
        NEXT_PUBLIC_CCTV_URL.
      </p>
    </main>
  );
}
