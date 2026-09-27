'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';

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
  const [src] = useState(resolveCctvUrl);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [src]);

  return (
    <main className="viewer page-transition">
      <div className="viewer-bar">
        <Link className="back-link solid" href="/pedestrian">
          <Icon name="arrowLeft" /> Kembali
        </Link>
        <span className="viewer-title">
          <Icon name="video" /> CCTV
        </span>
      </div>
      <div className="viewer-frame">
        {loading && (
          <div className="viewer-loading">
            <Icon name="loader" className="spin" />
            <span>Memuat kamera CCTV…</span>
          </div>
        )}
        {error && (
          <div className="viewer-error">
            <Icon name="wifiOff" />
            <span>Tidak dapat terhubung ke kamera CCTV. Periksa koneksi internet Anda.</span>
          </div>
        )}
        <iframe
          src={src}
          title="Live CCTV"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          style={{ display: loading || error ? 'none' : 'block' }}
        />
      </div>
    </main>
  );
}
