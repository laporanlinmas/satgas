import { uploadImageBuffer } from '@/lib/server/cloudinary';
import { ApiError, ok, route, str } from '@/lib/server/http';
import { MAX_UPLOAD_BYTES } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Cadangan ketika upload langsung ke Cloudinary tidak tersedia.
 * Menerima satu foto (≤ ± 400 KB) sebagai multipart/form-data.
 */
export async function POST(request: Request) {
  return route(async () => {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError('Permintaan tidak dapat dibaca.', 400, 'invalid_form');
    }

    const file = form.get('foto');
    if (!(file instanceof Blob) || file.size === 0) {
      throw new ApiError('Foto tidak ditemukan pada permintaan.', 400, 'missing_file');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ApiError('Ukuran foto melebihi batas 400 KB.', 413, 'payload_too_large');
    }

    const scope = (str(form.get('scope'), 40) || 'umum')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');

    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await uploadImageBuffer(buffer, {
      folder: `sipedas/${scope || 'umum'}`,
      publicId: `${scope || 'umum'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tags: ['sipedas', scope || 'umum'],
    });

    return ok({ publicId: asset.publicId, url: asset.url, bytes: asset.bytes });
  });
}
