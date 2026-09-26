import { NextResponse } from 'next/server';
import { POST as pedestrianPost } from '../pedestrian/route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Alias lama `/api/proxy` → `/api/pedestrian`.
 * Dipertahankan agar tautan atau service worker lama tetap berfungsi.
 */
export async function POST(request: Request) {
  return pedestrianPost(request);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('action') === 'ping') {
    return NextResponse.json({ success: true, message: 'pong' });
  }
  return NextResponse.json(
    { success: false, message: 'Gunakan /api/pedestrian. Endpoint ini hanya alias.' },
    { status: 308, headers: { Location: '/api/pedestrian' } },
  );
}
