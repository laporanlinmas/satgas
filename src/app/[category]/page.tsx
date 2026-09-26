import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StructuredCategoryClient from '@/features/structured/StructuredCategoryClient';
import { getCategoryBySlug, STRUCTURED_CATEGORIES } from '@/lib/constants';

export function generateStaticParams() {
  return STRUCTURED_CATEGORIES.map(category => ({ category: category.slug }));
}

export function generateMetadata({ params }: { params: { category: string } }): Metadata {
  const category = getCategoryBySlug(params.category);
  if (!category) return { title: 'Kategori tidak ditemukan' };
  return {
    title: `Laporan ${category.name}`,
    description: category.description,
  };
}

export default function CategoryPage({ params }: { params: { category: string } }) {
  const category = getCategoryBySlug(params.category);
  if (!category || category.flow !== 'structured') notFound();

  return <StructuredCategoryClient slug={category.slug} />;
}
