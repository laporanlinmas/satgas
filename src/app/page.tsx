import type { Metadata } from 'next';
import CategoryLanding from '@/components/CategoryLanding';

export const metadata: Metadata = {
  title: 'SIPEDAS — Sistem Pelaporan Digital Satgas Linmas',
};

export default function HomePage() {
  return <CategoryLanding />;
}
