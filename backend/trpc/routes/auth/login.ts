import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { adminAuth, adminDb } from "../../../lib/firebase-admin";
import { TRPCError } from "@trpc/server";

// Admin login schema
const adminLoginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Admin credentials (in production, store these securely)
const ADMIN_CREDENTIALS = {
  'admin@beerapp.com': 'SecureAdmin123!',
  'admin@beer-app.com': 'SecureAdmin123!',
};

// Admin login procedure
export const adminLoginProcedure = publicProcedure
  .input(adminLoginSchema)
  .mutation(async ({ input }) => {
    try {
      console.log('Admin login attempt:', { email: input.email });
      
      // Check if email is in admin list
      if (!ADMIN_CREDENTIALS[input.email as keyof typeof ADMIN_CREDENTIALS]) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid admin credentials'
        });
      }
      
      // Verify password
      const expectedPassword = ADMIN_CREDENTIALS[input.email as keyof typeof ADMIN_CREDENTIALS];
      if (input.password !== expectedPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid admin credentials'
        });
      }
      
      // Create a custom token for the admin
      const customToken = await adminAuth.createCustomToken(input.email, {
        role: 'admin',
        email: input.email,
      });
      
      // Log admin login
      await adminDb.collection('admin_actions').add({
        action: 'admin_login',
        userId: input.email,
        adminId: input.email,
        details: {
          loginTime: new Date(),
          userAgent: 'admin-panel',
        },
        timestamp: new Date(),
        createdAt: new Date(),
      });
      
      console.log('Admin login successful:', { email: input.email });
      
      return {
        success: true,
        customToken,
        message: 'Admin login successful',
      };
    } catch (error) {
      console.error('Admin login error:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Admin login failed. Please try again.'
      });
    }
  });

// Input validation schema
const loginSchema = z.object({
  email: z.string()
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, "Password is required"),
});

export const loginProcedure = publicProcedure
  .input(loginSchema)
  .mutation(async ({ input }) => {
    try {
      console.log('Login attempt:', { email: input.email });
      
      // Get user from Firebase Auth
      const firebaseUser = await adminAuth.getUserByEmail(input.email);
      
      // Get user data from Firestore
      const userDoc = await adminDb.collection('users').doc(firebaseUser.uid).get();
      
      if (!userDoc.exists) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found'
        });
      }
      
      const userData = userDoc.data();
      
      // Create custom token for client authentication
      const customToken = await adminAuth.createCustomToken(firebaseUser.uid);
      
      console.log('User logged in successfully:', { id: firebaseUser.uid, email: input.email });
      
      return {
        success: true,
        message: 'Login successful',
        token: customToken,
        user: {
          id: firebaseUser.uid,
          name: userData?.name,
          email: userData?.email,
          phone: userData?.phone,
          location: userData?.location,
          verificationStatus: userData?.verificationStatus,
          username: userData?.username,
          selfieUrl: userData?.selfieUrl,
          createdAt: userData?.createdAt,
          approvedAt: userData?.approvedAt,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle Firebase Auth errors
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
              message: 'No account found with this email address'
            });
          case 'auth/invalid-email':
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Please enter a valid email address'
            });
          default:
            console.error('Firebase error:', firebaseError);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Login failed. Please try again.'
            });
        }
      }
      
      // Handle unknown errors
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Login failed. Please try again.'
      });
    }
  });