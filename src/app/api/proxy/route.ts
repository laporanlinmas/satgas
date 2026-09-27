import { NextResponse } from 'next/server';
import { POST as pedestrianPost } from '../pedestrian/route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Alias lama `/api/proxy` → `/api/pedestrian`, dipakai oleh tautan WhatsApp
 * dan versi aplikasi lama yang masih berada di cache browser.
 */
export async function POST(request: Request) {
  return pedestrianPost(request);
}

export async function GET() {
  return NextResponse.json(
    { success: false, message: 'Gunakan /api/pedestrian. Endpoint ini hanya alias.' },
    { status: 308, headers: { Location: '/api/pedestrian' } },
  );
}
