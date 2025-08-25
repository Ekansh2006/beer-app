export const CLOUDINARY_CONFIG = {
  cloudName: 'df4tx4erp',
  uploadPreset: 'beer_app_unsigned', // Use your new unsigned preset name
  apiKey: '736319717389867'
};

export type CloudinaryTransformOptions = {
  quality?: 'auto' | number;
  format?: 'auto' | 'jpg' | 'png' | 'webp' | 'heic';
  progressive?: boolean;
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'crop';
  gravity?: 'auto' | 'center' | 'face' | string;
  width?: number | 'auto';
  height?: number;
  dpr?: 'auto' | number;
};

export function transformCloudinaryUrl(url: string, opts: CloudinaryTransformOptions): string {
  try {
    if (!url || typeof url !== 'string') return url;
    const isCloudinary = url.includes('res.cloudinary.com') || url.includes('cloudinary.com');
    if (!isCloudinary) return url;

    const u = new URL(url);
    const parts = u.pathname.split('/');
    const uploadIndex = parts.findIndex((p) => p === 'upload');
    if (uploadIndex === -1) return url;

    const tx: string[] = [];
    const q = opts.quality ?? 'auto';
    const f = opts.format ?? 'auto';
    tx.push(`q_${q}`);
    tx.push(`f_${f}`);
    if (opts.progressive) tx.push('fl_progressive');
    if (opts.crop) tx.push(`c_${opts.crop}`);
    if (opts.gravity) tx.push(`g_${opts.gravity}`);
    if (opts.width) tx.push(`w_${opts.width}`);
    if (opts.height) tx.push(`h_${opts.height}`);
    if (opts.dpr) tx.push(`dpr_${opts.dpr}`);

    const txString = tx.join(',');
    const before = parts.slice(0, uploadIndex + 1).join('/');
    const after = parts.slice(uploadIndex + 1).join('/');
    u.pathname = `${before}/${txString}/${after}`;
    return u.toString();
  } catch {
    return url;
  }
}

// Updated function that works on web and native and accepts multiple input types
export const uploadImageToCloudinary = async (input: string | File | Blob): Promise<string> => {
  const formData = new FormData();

  const appendBlob = (blob: Blob, name: string) => {
    formData.append('file', blob, name);
  };

  if (typeof input === 'string') {
    if (input.startsWith('data:')) {
      const resp = await fetch(input);
      const blob = await resp.blob();
      appendBlob(blob, 'photo.jpg');
    } else {
      formData.append('file', {
        uri: input,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);
    }
  } else if (typeof File !== 'undefined' && input instanceof File) {
    appendBlob(input, input.name || 'photo.jpg');
  } else if (input instanceof Blob) {
    appendBlob(input, 'photo.jpg');
  } else {
    throw new Error('Unsupported image input');
  }

  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

  const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Upload failed (${resp.status}). ${errText}`.trim());
  }

  const data: any = await resp.json();
  const url: string | undefined = data?.secure_url;
  if (!url) {
    throw new Error('Upload succeeded but no secure_url returned');
  }

  return transformCloudinaryUrl(url, {
    quality: 'auto',
    format: 'auto',
    progressive: true,
    crop: 'fill',
    gravity: 'auto',
    width: 1080,
    dpr: 'auto',
  });
};
