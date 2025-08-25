import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { adminAuth, adminDb } from "../../../lib/firebase-admin";
import { uploadProfileSelfie } from "../../../lib/cloudinary-config";
import { TRPCError } from "@trpc/server";

// Input validation schema for selfie upload
const uploadSelfieSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  imageBase64: z.string().min(1, "Image data is required"),
});

// Input validation schema for updating user status
const updateUserStatusSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  status: z.enum(['pending_verification', 'approved_username_assigned', 'rejected']),
  username: z.string().optional(),
});

export const uploadSelfieProcedure = publicProcedure
  .input(uploadSelfieSchema)
  .mutation(async ({ input }) => {
    try {
      console.log('Selfie upload attempt:', { userId: input.userId });
      
      // Verify user exists in Firebase Auth
      const firebaseUser = await adminAuth.getUser(input.userId);
      
      // Get user document from Firestore
      const userDoc = await adminDb.collection('users').doc(input.userId).get();
      
      if (!userDoc.exists) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found'
        });
      }
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(input.imageBase64, 'base64');
      
      // Upload to Cloudinary
      const selfieUrl = await uploadProfileSelfie(imageBuffer);
      
      // Update user document with selfie URL
      await adminDb.collection('users').doc(input.userId).update({
        selfieUrl: selfieUrl,
        updatedAt: new Date(),
      });
      
      console.log('Selfie uploaded successfully:', { userId: input.userId, selfieUrl });
      
      return {
        success: true,
        message: 'Selfie uploaded successfully',
        selfieUrl: selfieUrl,
      };
    } catch (error) {
      console.error('Selfie upload error:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      // Handle Firebase specific errors
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string; message: string };
        
        switch (firebaseError.code) {
          case 'auth/user-not-found':
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'User not found'
            });
          default:
            console.error('Firebase error:', firebaseError);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to upload selfie. Please try again.'
            });
        }
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to upload selfie. Please try again.'
      });
    }
  });

export const updateUserStatusProcedure = publicProcedure
  .input(updateUserStatusSchema)
  .mutation(async ({ input }) => {
    try {
      console.log('User status update attempt:', { userId: input.userId, status: input.status });
      
      // Verify user exists in Firebase Auth
      const firebaseUser = await adminAuth.getUser(input.userId);
      
      // Get user document from Firestore
      const userDoc = await adminDb.collection('users').doc(input.userId).get();
      
      if (!userDoc.exists) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found'
        });
      }
      
      // Prepare update data
      const updateData: any = {
        verificationStatus: input.status,
        updatedAt: new Date(),
      };
      
      // If approving user and username provided, add username and approval date
      if (input.status === 'approved_username_assigned' && input.username) {
        updateData.username = input.username;
        updateData.approvedAt = new Date();
      }
      
      // Update user document
      await adminDb.collection('users').doc(input.userId).update(updateData);
      
      console.log('User status updated successfully:', { userId: input.userId, status: input.status });
      
      return {
        success: true,
        message: 'User status updated successfully',
        status: input.status,
        username: input.username || null,
      };
    } catch (error) {
      console.error('User status update error:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      // Handle Firebase specific errors
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string; message: string };
        
        switch (firebaseError.code) {
          case 'auth/user-not-found':
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'User not found'
            });
          default:
            console.error('Firebase error:', firebaseError);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to update user status. Please try again.'
            });
        }
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user status. Please try again.'
      });
    }
  });