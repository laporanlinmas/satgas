'use client';

import { AppProvider } from '@/features/core/AppContext';
import StructuredReportPage from '@/features/structured/StructuredReportPage';
import { getCategoryBySlug } from '@/lib/constants';

/** Wrapper klien: satu provider per kategori (scope penyimpanan terpisah). */
export default function StructuredCategory({ slug }: { slug: string }) {
  const category = getCategoryBySlug(slug);
  if (!category) return null;

  return (
    <AppProvider scope={category.slug}>
      <StructuredReportPage />
    </AppProvider>
  );
}
