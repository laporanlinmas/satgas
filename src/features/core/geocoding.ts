import type { GeoAddress } from './types';

/**
 * Reverse geocoding ringan (OpenStreetMap / Nominatim).
 *
 * - Cache in-memory dengan TTL agar foto berdekatan tidak memanggil API berulang.
 * - Maksimal tiga percobaan zoom agar hemat kuota & cepat.
 * - Selalu mengembalikan nilai (fallback ke koordinat) supaya watermark
 *   tidak pernah menggantung.
 */

const ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 5_000;
const ZOOM_CHAIN = [18, 17, 16];

interface NominatimResponse {
  address?: Record<string, string>;
  namedetails?: { name?: string };
  display_name?: string;
}

const cache = new Map<string, { at: number; value: GeoAddress }>();
const inFlight = new Map<string, Promise<GeoAddress>>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function buildFromAddress(road: string | null, houseNumber: string | null, address: Record<string, string>): GeoAddress {
  const parts: string[] = [];
  if (road) parts.push(houseNumber ? `${road} No.${houseNumber}` : road);

  const hamlet = address.hamlet || address.allotments || address.neighbourhood || address.quarter;
  if (hamlet && hamlet !== road) parts.push(`Dukuh ${hamlet}`);

  const village = address.village || address.town || address.suburb;
  if (village) parts.push(`Desa ${village}`);

  const district = address.subdistrict || address.city_district;
  if (district) parts.push(`Kec. ${district}`);

  const city = address.city || address.county || address.regency || address.municipality;
  if (city) parts.push(city);
  if (address.state) parts.push(address.state);
  parts.push('Indonesia');

  return { full: parts.join(', '), road: road || '', parts };
}

function buildFallback(lat: number, lng: number, address?: Record<string, string>): GeoAddress {
  if (address) {
    const parts: string[] = [];
    const village = address.village || address.town || address.suburb;
    if (village) parts.push(village);
    const district = address.subdistrict || address.city_district;
    if (district) parts.push(`Kec. ${district}`);
    const city = address.city || address.county || address.regency;
    if (city) parts.push(city);
    if (address.state) parts.push(address.state);
    parts.push('Indonesia');
    if (parts.length > 1) return { full: parts.join(', '), road: '', parts };
  }
  return { full: `${lat.toFixed(5)}, ${lng.toFixed(5)}, Indonesia`, road: '', parts: [] };
}

const ROAD_KEYS = [
  'road', 'pedestrian', 'footway', 'path', 'cycleway', 'service', 'track',
  'living_street', 'residential', 'unclassified', 'tertiary', 'secondary',
  'primary', 'trunk', 'motorway', 'highway',
];

function extractRoad(data: NominatimResponse): string | null {
  const address = data.address || {};
  for (const key of ROAD_KEYS) {
    const value = address[key];
    if (value) return value;
  }
  if (data.namedetails?.name) return data.namedetails.name;
  const head = (data.display_name || '').split(',')[0]?.trim();
  if (head && !/^\d+\.?\d*$/.test(head) && head.length > 3) return head;
  return null;
}

async function fetchZoom(lat: number, lng: number, zoom: number, signal: AbortSignal) {
  const url =
    `${ENDPOINT}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=${zoom}` +
    `&addressdetails=1&namedetails=1&accept-language=id`;
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`nominatim ${response.status}`);
  return (await response.json()) as NominatimResponse;
}

async function resolve(lat: number, lng: number): Promise<GeoAddress> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let last: NominatimResponse | null = null;
    for (const zoom of ZOOM_CHAIN) {
      try {
        const data = await fetchZoom(lat, lng, zoom, controller.signal);
        last = data;
        const road = extractRoad(data);
        if (road) return buildFromAddress(road, data.address?.house_number || null, data.address || {});
      } catch {
        /* coba zoom berikutnya */
      }
      if (controller.signal.aborted) break;
    }
    return buildFallback(lat, lng, last?.address);
  } catch {
    return buildFallback(lat, lng);
  } finally {
    clearTimeout(timer);
  }
}

export function reverseGeocode(lat: number, lng: number): Promise<GeoAddress> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Promise.resolve(buildFallback(0, 0));
  }

  const key = cacheKey(lat, lng);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const task = resolve(lat, lng)
    .then(value => {
      cache.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, task);
  return task;
}

/** Alias kompatibilitas; sama dengan reverseGeocode. */
export const reverseGeocodeForceStreet = reverseGeocode;
