'use client';

import { useApp } from '../core/AppContext';
import { composeManualAddress, type WatermarkContext } from '../core/watermark';
import { parseReport } from '@/lib/pedestrianParser';
import type { BuildContext } from '../core/usePhotoProcessor';

/** Nama Danru dari teks laporan, mis. "Danru 12 (Suyatno)". */
export function extractDanruName(reportText: string): string {
  const parsed = parseReport(reportText);
  if (parsed.namaDanru) return titleCase(parsed.namaDanru);
  return parsed.danru || '—';
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function parseCoord(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Konteks watermark pedestrian: program = Pedestrian, unit = Danru, lokasi manual. */
export function usePedestrianWatermarkContext(): BuildContext {
  const { category, reportText, location, coords } = useApp();

  return input => {
    const lat = input.exif?.gps?.lat ?? parseCoord(coords.lat);
    const lng = input.exif?.gps?.lng ?? parseCoord(coords.lng);
    const gps = lat !== null && lng !== null ? { lat, lng } : null;

    const context: WatermarkContext = {
      program: category.name,
      unit: extractDanruName(reportText),
      fallbackAddress: composeManualAddress(location),
      gps,
      address: input.address,
      capturedAt: input.capturedAt,
    };
    return context;
  };
}
