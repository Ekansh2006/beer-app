export const CLOUDINARY_CONFIG = {
  cloudName: 'df4tx4erp',
  uploadPreset: 'beer_app_unsigned', // Your unsigned preset
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

/**
 * Uploads an image to Cloudinary.
 * Works for both native (file URI string) and web (File object).
 * @param {string | File} imageUriOrFile - The native file URI or the web File object.
 * @returns {Promise<string>} The secure URL of the uploaded image.
 */
export const uploadImageToCloudinary = async (imageUriOrFile: string | File): Promise<string> => {
  const formData = new FormData();

  // Handle the file input based on its type
  if (typeof imageUriOrFile === 'string') {
    // NATIVE: The input is a file URI string from Expo Image Picker
    formData.append('file', {
      uri: imageUriOrFile,
      type: 'image/jpeg', // Assume jpeg for simplicity
      name: 'photo.jpg',
    } as any);
  } else {
    // WEB: The input is a File object from the <input type="file">
    formData.append('file', imageUriOrFile);
  }
  
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();

    if (!response.ok || !data.secure_url) {
      // Provide a more detailed error message from Cloudinary if available
      throw new Error(data?.error?.message || 'Image upload failed. No URL returned.');
    }
    
    const url: string = data.secure_url;

    return transformCloudinaryUrl(url, {
      quality: 'auto',
      format: 'auto',
      progressive: true,
      crop: 'fill',
      gravity: 'auto',
      width: 1080,
      dpr: 'auto',
    });
  } catch (e: any) {
    console.error("Cloudinary Upload Error:", e);
    // Re-throw the error so the UI component can catch it and show a message
    throw new Error(e.message || 'Image upload failed. Please try again.');
  }
};
