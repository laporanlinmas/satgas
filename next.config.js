const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  eslint: {
    // Linting dijalankan terpisah lewat `npm run lint`.
    ignoreDuringBuilds: true,
  },

  typescript: {
    // `npm run typecheck` menjadi gerbang wajib sebelum deploy.
    ignoreBuildErrors: true,
  },

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      {
        // Aset bersifat immutable (nama berkas berisi hash).
        source: '/assets/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Rute lama masih dipakai oleh tautan yang tersebar di WhatsApp.
      { source: '/proxy', destination: '/pedestrian', permanent: true },
      { source: '/kategori/:slug', destination: '/:slug', permanent: true },
    ];
  },
};

module.exports = nextConfig;
