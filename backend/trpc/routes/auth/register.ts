import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { adminAuth, adminDb } from "../../../lib/firebase-admin";
import { TRPCError } from "@trpc/server";
import { uploadProfileSelfie } from "../../../lib/cloudinary-config";

// Input validation schema
const registerSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .trim(),
  email: z.string()
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),
  phone: z.string()
    .min(10, "Please enter a valid phone number")
    .regex(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number")
    .transform(val => val.replace(/[\s\-\(\)]/g, '')),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
  location: z.string()
    .min(2, "Location is required")
    .max(100, "Location is too long")
    .trim(),
  selfieBase64: z.string().optional(), // Optional selfie during registration
});

export const registerProcedure = publicProcedure
  .input(registerSchema)
  .mutation(async ({ input }) => {
    try {
      console.log('Registration attempt:', { email: input.email, name: input.name });
      
      // Check if user already exists in Firebase Auth
      try {
        await adminAuth.getUserByEmail(input.email);
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An account with this email already exists'
        });
      } catch (error: any) {
        // If user doesn't exist, continue with registration
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }
      
      // Check for duplicate phone in Firestore
      const phoneQuery = await adminDb.collection('users')
        .where('phone', '==', input.phone)
        .limit(1)
        .get();
      
      if (!phoneQuery.empty) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An account with this phone number already exists'
        });
      }
      
      // Create Firebase Auth user
      const firebaseUser = await adminAuth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.name,
      });
      
      // Handle selfie upload if provided
      let selfieUrl: string | null = null;
      if (input.selfieBase64) {
        try {
          const imageBuffer = Buffer.from(input.selfieBase64, 'base64');
          selfieUrl = await uploadProfileSelfie(imageBuffer);
          console.log('Selfie uploaded during registration:', { userId: firebaseUser.uid, selfieUrl });
        } catch (selfieError) {
          console.error('Selfie upload failed during registration:', selfieError);
          // Continue with registration even if selfie upload fails
          // User can upload selfie later
        }
      }
      
      // Create user document in Firestore
      const userData = {
        id: firebaseUser.uid,
        email: input.email,
        phone: input.phone,
        name: input.name,
        location: input.location,
        verificationStatus: 'pending_verification' as const,
        username: null,
        selfieUrl: selfieUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
        approvedAt: null,
        // Additional metadata for admin review
        registrationComplete: !!selfieUrl, // True if selfie was uploaded during registration
        requiresSelfieUpload: !selfieUrl, // True if user still needs to upload selfie
      };
      
      await adminDb.collection('users').doc(firebaseUser.uid).set(userData);
      
      // Generate custom authentication token for immediate login
      const customToken = await adminAuth.createCustomToken(firebaseUser.uid, {
        email: userData.email,
        name: userData.name,
        verificationStatus: userData.verificationStatus,
      });
      
      console.log('User registered successfully:', { 
        id: firebaseUser.uid, 
        email: input.email,
        selfieUploaded: !!selfieUrl 
      });
      
      // Return success response with authentication token
      return {
        success: true,
        message: selfieUrl 
          ? 'Account created successfully! We\'re reviewing your submission.'
          : 'Account created successfully! Please upload your selfie to complete registration.',
        user: {
          id: firebaseUser.uid,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          location: userData.location,
          verificationStatus: userData.verificationStatus,
          selfieUrl: userData.selfieUrl,
          registrationComplete: userData.registrationComplete,
          requiresSelfieUpload: userData.requiresSelfieUpload,
          createdAt: userData.createdAt,
        },
        // Authentication tokens for immediate login
        auth: {
          customToken: customToken,
          uid: firebaseUser.uid,
        },
        // Next steps for the user
        nextSteps: {
          uploadSelfie: !selfieUrl,
          awaitVerification: !!selfieUrl,
        },
      };
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle Firebase Auth errors
      if (error instanceof TRPCError) {
        throw error;
      }
      
      // Handle Firebase specific errors
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string; message: string };
        
        switch (firebaseError.code) {
          case 'auth/email-already-exists':
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'An account with this email already exists'
            });
          case 'auth/invalid-email':
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Please enter a valid email address'
            });
          case 'auth/weak-password':
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Password is too weak. Please choose a stronger password'
            });
          default:
            console.error('Firebase error:', firebaseError);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to create account. Please try again.'
            });
        }
      }
      
      // Handle unknown errors
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create account. Please try again.'
      });
    }
  });