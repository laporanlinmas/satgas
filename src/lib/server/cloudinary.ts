import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('CLOUDINARY_CLOUD_NAME belum dikonfigurasi.');
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

export function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    hasSecret: Boolean(process.env.CLOUDINARY_API_SECRET),
  };
}

export interface CloudinaryAsset {
  url: string;
  publicId: string;
  bytes?: number;
  width?: number;
  height?: number;
}

function uploadBuffer(
  buffer: Buffer,
  options: {
    folder: string;
    publicId?: string;
    tags?: string[];
    context?: Record<string, string>;
  },
): Promise<CloudinaryAsset> {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: 'image',
        public_id: options.publicId,
        tags: options.tags,
        context: options.context,
        overwrite: true,
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary tidak mengembalikan hasil upload.'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      },
    );
    stream.end(buffer);
  });
}

export async function uploadImageBase64(
  dataUrl: string,
  options: {
    folder: string;
    publicId?: string;
    tags?: string[];
    context?: Record<string, string>;
  },
): Promise<CloudinaryAsset> {
  const comma = dataUrl.indexOf(',');
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return uploadBuffer(Buffer.from(payload, 'base64'), options);
}

export async function uploadImageBuffer(
  buffer: Buffer,
  options: {
    folder: string;
    publicId?: string;
    tags?: string[];
    context?: Record<string, string>;
  },
): Promise<CloudinaryAsset> {
  return uploadBuffer(buffer, options);
}

/**
 * Parameter tanda tangan untuk upload langsung dari browser.
 * Dipakai agar foto tidak perlu melewati body Next.js (batas 4.5 MB).
 */
export function signUpload(options: {
  timestamp: number;
  folder: string;
  publicId: string;
  tags?: string[];
  context?: Record<string, string>;
}) {
  ensureConfigured();
  const params: Record<string, unknown> = {
    timestamp: options.timestamp,
    folder: options.folder,
    public_id: options.publicId,
  };
  if (options.tags?.length) params.tags = options.tags.join(',');
  if (options.context) params.context = options.context;

  const signature = cloudinary.utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET || '',
  );

  return {
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    timestamp: options.timestamp,
    folder: options.folder,
    publicId: options.publicId,
    tags: options.tags ?? [],
    context: options.context ?? {},
  };
}

export async function destroyImage(publicId: string): Promise<void> {
  if (!publicId) return;
  ensureConfigured();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  } catch (error) {
    console.warn('[cloudinary] gagal menghapus aset', publicId, error);
  }
}
