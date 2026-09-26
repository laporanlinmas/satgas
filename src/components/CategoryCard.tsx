import Link from 'next/link';
import Icon, { categoryIcons } from './Icon';
import type { CategoryDef } from '@/lib/constants';

/**
 * Kartu kategori pada menu utama: ikon + nama saja supaya tetap ringkas di
 * layar sempit. `withNote` menambah deskripsi singkat dan dipakai pada halaman
 * 404, di mana kategori perlu dibedakan lewat kalimat.
 */
export default function CategoryCard({
  category,
  withNote = false,
}: {
  category: CategoryDef;
  withNote?: boolean;
}) {
  const CategoryIcon = categoryIcons[category.icon];

  return (
    <Link
      className={`landing-card tone-${category.tone}${withNote ? ' has-note' : ''}`}
      href={category.href}
      data-flow={category.flow}
    >
      <span className="landing-ico">
        <CategoryIcon aria-hidden="true" />
      </span>
      <span className="landing-copy">
        <strong>{category.name}</strong>
        {withNote ? <small>{category.description}</small> : null}
      </span>
      <Icon name="arrowRight" className="landing-arrow" />
    </Link>
  );
}
