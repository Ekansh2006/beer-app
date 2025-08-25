import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'df4tx4erp',
  api_key: '736319717389867',
  api_secret: 'AbfZgGKdcO_tHAzRhys6kiOkaN8'
});

export { cloudinary };

export const uploadImageToCloudinary = async (imageBuffer: Buffer, folder: string = 'beer-app') => {
  try {
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
      {
        folder,
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto:good' },
          { format: 'auto' }
        ]
      }
    );
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Image upload failed');
  }
};

export const uploadProfileSelfie = async (imageBuffer: Buffer) => {
  try {
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
      {
        folder: 'beer-app/profiles',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto:good' },
          { format: 'auto' }
        ]
      }
    );
    return result.secure_url;
  } catch (error) {
    console.error('Profile selfie upload error:', error);
    throw new Error('Profile selfie upload failed');
  }
};

export const uploadUserSelfie = async (imageBuffer: Buffer, userId: string, meta: { verificationStatus: string }) => {
  try {
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
      {
        folder: `beer-app/selfies/${userId}`,
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto:good' },
          { format: 'auto' }
        ],
        context: {
          userId,
          verificationStatus: meta.verificationStatus,
          uploadedAt: new Date().toISOString(),
        } as unknown as Record<string, string>
      }
    );
    return { url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    console.error('User selfie upload error:', error);
    throw new Error('User selfie upload failed');
  }
};

export const uploadUserProfilePhoto = async (imageBuffer: Buffer, userId: string) => {
  try {
    // Validate buffer size and format before upload
    if (imageBuffer.byteLength > 1_000_000) {
      throw new Error('Image too large. Maximum size is 1MB.');
    }
    
    if (imageBuffer.byteLength < 1000) {
      throw new Error('Image too small. Please upload a valid photo.');
    }
    
    // Basic format validation
    const jpegHeader = imageBuffer.subarray(0, 3);
    const pngHeader = imageBuffer.subarray(0, 8);
    
    const isJPEG = jpegHeader[0] === 0xFF && jpegHeader[1] === 0xD8 && jpegHeader[2] === 0xFF;
    const isPNG = pngHeader[0] === 0x89 && pngHeader[1] === 0x50 && pngHeader[2] === 0x4E && pngHeader[3] === 0x47;
    
    if (!isJPEG && !isPNG) {
      throw new Error('Invalid image format. Only JPEG and PNG are supported.');
    }
    
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${imageBuffer.toString('base64')}`,
      {
        folder: `beer-app/profiles/${userId}`,
        // Enhanced transformations for better compression and quality
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:good' },
          { format: 'auto' },
          { fetch_format: 'auto' }, // Automatically serve WebP/AVIF when supported
          { flags: 'progressive' }, // Progressive JPEG loading
        ],
        // Security and metadata
        context: {
          userId,
          uploadedAt: new Date().toISOString(),
          type: 'profile-photo',
          version: '1.0',
        } as unknown as Record<string, string>,
        // Additional security options
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        // Auto-moderate content (requires Cloudinary add-on)
        // moderation: 'aws_rek',
      }
    );

    const fullUrl = result.secure_url;
    const publicId = result.public_id;

    // Generate optimized thumbnail with face detection
    const thumbUrl = cloudinary.url(publicId, {
      secure: true,
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto:eco' },
        { format: 'auto' },
        { fetch_format: 'auto' },
        { flags: 'progressive' },
      ]
    });

    console.log('[cloudinary] Profile photo uploaded successfully', {
      userId,
      publicId,
      originalSize: imageBuffer.byteLength,
      resultSize: result.bytes,
    });

    return { url: fullUrl, thumbUrl, publicId };
  } catch (error) {
    console.error('User profile photo upload error:', error);
    
    if (error instanceof Error) {
      throw error; // Re-throw validation errors with original message
    }
    
    throw new Error('User profile photo upload failed');
  }
};

export const deleteImageFromCloudinary = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Image deletion failed');
  }
};