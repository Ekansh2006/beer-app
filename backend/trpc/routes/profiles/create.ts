import { z } from 'zod';
import { publicProcedure } from '../../create-context';
import { adminAuth, adminDb } from '../../../lib/firebase-admin';
import { TRPCError } from '@trpc/server';
import { uploadUserProfilePhoto } from '../../../lib/cloudinary-config';
import { FieldValue } from 'firebase-admin/firestore';

const inputSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  age: z.number()
    .int('Age must be a whole number')
    .min(18, 'Must be at least 18 years old')
    .max(95, 'Age must be less than 95'),
  city: z.string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must be less than 100 characters')
    .regex(/^[a-zA-Z\s,.-]+$/, 'City can only contain letters, spaces, commas, periods, and hyphens'),
  description: z.string()
    .max(300, 'Description must be less than 300 characters')
    .optional()
    .nullable()
    .transform(val => val?.trim() || ''),
  imageBase64: z.string()
    .min(1, 'Profile photo is required')
    .refine(val => {
      try {
        const buffer = Buffer.from(val, 'base64');
        return buffer.length > 0;
      } catch {
        return false;
      }
    }, 'Invalid image data'),
});

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_PROFILES_PER_HOUR = 3;

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return;
  }
  
  if (userLimit.count >= MAX_PROFILES_PER_HOUR) {
    throw new TRPCError({ 
      code: 'TOO_MANY_REQUESTS', 
      message: `Rate limit exceeded. You can create maximum ${MAX_PROFILES_PER_HOUR} profiles per hour.` 
    });
  }
  
  userLimit.count++;
}

function validateImageBuffer(buffer: Buffer): void {
  // Check file size (1MB limit)
  if (buffer.byteLength > 1_000_000) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Image too large. Maximum size is 1MB.' });
  }
  
  // Check minimum size (avoid tiny/invalid images)
  if (buffer.byteLength < 1000) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Image too small. Please upload a valid photo.' });
  }
  
  // Basic image format validation (check for JPEG/PNG headers)
  const jpegHeader = buffer.subarray(0, 3);
  const pngHeader = buffer.subarray(0, 8);
  
  const isJPEG = jpegHeader[0] === 0xFF && jpegHeader[1] === 0xD8 && jpegHeader[2] === 0xFF;
  const isPNG = pngHeader[0] === 0x89 && pngHeader[1] === 0x50 && pngHeader[2] === 0x4E && pngHeader[3] === 0x47;
  
  if (!isJPEG && !isPNG) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid image format. Only JPEG and PNG are supported.' });
  }
}

function sanitizeInput(input: any) {
  return {
    ...input,
    name: input.name.trim().replace(/\s+/g, ' '), // Remove extra whitespace
    city: input.city.trim().replace(/\s+/g, ' '),
    description: input.description?.trim().replace(/\s+/g, ' ') || '',
  };
}

export const createProfileProcedure = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    try {
      console.log('[profiles.create] start', { userId: input.userId, name: input.name });

      // Sanitize input
      const sanitizedInput = sanitizeInput(input);

      // Rate limiting check
      checkRateLimit(input.userId);

      // Verify user exists and is authenticated
      const userRecord = await adminAuth.getUser(input.userId);
      if (!userRecord) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid user authentication' });
      }

      // Get user document from Firestore
      const userDoc = await adminDb.collection('users').doc(input.userId).get();
      if (!userDoc.exists) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found in database' });
      }

      const userData = userDoc.data();
      
      // Verify user is approved and has username (only verified users can create profiles)
      if (userData?.status !== 'approved_username_assigned' || !userData?.username) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Only verified users with approved usernames can create profiles. Please complete verification first.' 
        });
      }

      // Check if user already has too many profiles (limit to 5 active profiles)
      const existingProfilesQuery = await adminDb
        .collection('profiles')
        .where('uploaderUserId', '==', input.userId)
        .where('approvalStatus', 'in', ['pending', 'approved'])
        .get();
      
      if (existingProfilesQuery.size >= 5) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Maximum of 5 active profiles allowed per user.' 
        });
      }

      // Validate and process image
      const buffer = Buffer.from(input.imageBase64, 'base64');
      validateImageBuffer(buffer);

      // Upload image to Cloudinary with compression
      const { url, thumbUrl, publicId } = await uploadUserProfilePhoto(buffer, input.userId);

      // Create profile document
      const profileDoc = adminDb.collection('profiles').doc();
      const now = FieldValue.serverTimestamp();

      const profileData = {
        id: profileDoc.id,
        name: sanitizedInput.name,
        age: sanitizedInput.age,
        city: sanitizedInput.city,
        description: sanitizedInput.description,
        profileImageUrl: url,
        profileImageThumbUrl: thumbUrl,
        profileImagePublicId: publicId,
        uploaderUserId: input.userId,
        uploaderUsername: userData.username,
        uploaderEmail: userData.email, // For admin tracking
        greenFlags: 0,
        redFlags: 0,
        commentCount: 0,
        createdAt: now,
        updatedAt: now,
        approvalStatus: 'pending',
        isActive: true,
        reportCount: 0,
      };

      // Use transaction to ensure data consistency
      await adminDb.runTransaction(async (transaction) => {
        // Double-check rate limit within transaction
        const recentProfilesQuery = await adminDb
          .collection('profiles')
          .where('uploaderUserId', '==', input.userId)
          .where('createdAt', '>', new Date(Date.now() - RATE_LIMIT_WINDOW))
          .get();
        
        if (recentProfilesQuery.size >= MAX_PROFILES_PER_HOUR) {
          throw new TRPCError({ 
            code: 'TOO_MANY_REQUESTS', 
            message: `Rate limit exceeded. You can create maximum ${MAX_PROFILES_PER_HOUR} profiles per hour.` 
          });
        }

        // Create the profile
        transaction.set(profileDoc, profileData);
        
        // Update user's profile count
        const userRef = adminDb.collection('users').doc(input.userId);
        transaction.update(userRef, {
          profileCount: FieldValue.increment(1),
          lastProfileCreated: now,
        });
      });

      console.log('[profiles.create] success', { 
        id: profileDoc.id, 
        userId: input.userId,
        username: userData.username 
      });

      // Return profile data (without sensitive info)
      const responseData = {
        id: profileDoc.id,
        name: profileData.name,
        age: profileData.age,
        city: profileData.city,
        description: profileData.description,
        profileImageUrl: profileData.profileImageUrl,
        profileImageThumbUrl: profileData.profileImageThumbUrl,
        uploaderUsername: profileData.uploaderUsername,
        greenFlags: profileData.greenFlags,
        redFlags: profileData.redFlags,
        commentCount: profileData.commentCount,
        approvalStatus: profileData.approvalStatus,
        createdAt: new Date(),
      };

      return { success: true, profile: responseData };
    } catch (err) {
      console.error('[profiles.create] error', err);
      
      if (err instanceof TRPCError) throw err;
      
      if (err && typeof err === 'object' && 'code' in err) {
        const e = err as { code: string; message: string };
        switch (e.code) {
          case 'auth/user-not-found':
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
          case 'permission-denied':
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Permission denied' });
          default:
            console.error('[profiles.create] unexpected error code:', e.code);
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create profile' });
        }
      }
      
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create profile' });
    }
  });