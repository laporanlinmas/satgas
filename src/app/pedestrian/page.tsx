import type { Metadata } from 'next';
import { AppProvider } from '@/features/core/AppContext';
import PedestrianReportPage from '@/features/pedestrian/PedestrianReportPage';
import { PEDESTRIAN_CATEGORY } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Laporan Pedestrian',
  description: 'Tempel teks laporan patroli dan kirim foto ke Google Drive serta Spreadsheet.',
};

export default function PedestrianPage() {
  return (
    <AppProvider scope={PEDESTRIAN_CATEGORY.slug}>
      <PedestrianReportPage />
    </AppProvider>
  );
}
