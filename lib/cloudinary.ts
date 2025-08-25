export const CLOUDINARY_CONFIG = {
  cloudName: 'df4tx4erp',
  uploadPreset: 'beer-app-photos',
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

export const uploadImageToCloudinary = async (imageUri: string) => {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'photo.jpg'
  } as any);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    const url: string | undefined = data?.secure_url;
    if (!url) throw new Error('No URL returned');

    return transformCloudinaryUrl(url, {
      quality: 'auto',
      format: 'auto',
      progressive: true,
      crop: 'fill',
      gravity: 'auto',
      width: 1080,
      dpr: 'auto',
    });
  } catch (e) {
    throw new Error('Image upload failed');
  }
};