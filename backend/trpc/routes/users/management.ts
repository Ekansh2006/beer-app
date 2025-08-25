import { z } from "zod";
import { publicProcedure, adminProcedure } from "../../create-context";
import { adminAuth, adminDb } from "../../../lib/firebase-admin";
import { TRPCError } from "@trpc/server";

// Input validation schema for getting user by ID
const getUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

// Input validation schema for getting all users (admin only)
const getAllUsersSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
  status: z.enum(['pending_verification', 'approved', 'rejected', 'approved_username_assigned']).optional(),
});

// Input validation schema for updating user verification status
const updateUserStatusSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  status: z.enum(['approved', 'rejected']),
  reason: z.string().optional(),
  adminId: z.string().optional(), // For future admin authentication
});

// Generate unique username from name
async function generateUniqueUsername(name: string): Promise<string> {
  if (!name) {
    name = 'user';
  }
  
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
  const baseUsername = cleanName || 'user';
  
  // Try to find a unique username
  for (let i = 0; i < 100; i++) {
    const randomNum = Math.floor(Math.random() * 9999) + 1;
    const username = `${baseUsername}${randomNum}`;
    
    // Check if username already exists
    const existingUser = await adminDb.collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();
    
    if (existingUser.empty) {
      return username;
    }
  }
  
  // Fallback with timestamp if all attempts fail
  return `${baseUsername}${Date.now().toString().slice(-6)}`;
}

// Log admin actions for audit trail
async function logAdminAction(action: string, userId: string, adminId: string, details?: any) {
  try {
    await adminDb.collection('admin_actions').add({
      action,
      userId,
      adminId,
      details: details || {},
      timestamp: new Date(),
      createdAt: new Date(),
    });
    console.log('Admin action logged:', { action, userId, adminId });
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw error to avoid breaking the main operation
  }
}

export const getUserProcedure = publicProcedure
  .input(getUserSchema)
  .query(async ({ input }) => {
    try {
      console.log('Get user attempt:', { userId: input.userId });
      
      // Get user from Firebase Auth
      const firebaseUser = await adminAuth.getUser(input.userId);
      
      // Get user data from Firestore
      const userDoc = await adminDb.collection('users').doc(input.userId).get();
      
      if (!userDoc.exists) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User profile not found'
        });
      }
      
      const userData = userDoc.data();
      
      return {
        id: firebaseUser.uid,
        name: userData?.name,
        email: userData?.email,
        phone: userData?.phone,
        location: userData?.location,
        status: userData?.status,
        username: userData?.username,
        selfieUrl: userData?.selfieUrl,
        createdAt: userData?.createdAt,
        approvedAt: userData?.approvedAt,
        updatedAt: userData?.updatedAt,
      };
    } catch (error) {
      console.error('Get user error:', error);
      
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
              message: 'Failed to get user. Please try again.'
            });
        }
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user. Please try again.'
      });
    }
  });

export const getAllUsersProcedure = adminProcedure
  .input(getAllUsersSchema)
  .query(async ({ input }) => {
    try {
      console.log('Get all users attempt:', { limit: input.limit, status: input.status });
      
      // Build query
      let query = adminDb.collection('users')
        .orderBy('createdAt', 'desc')
        .limit(input.limit);
      
      // Filter by status if provided
      if (input.status) {
        if (input.status === 'approved') {
          // Include both 'approved' and 'approved_username_assigned' statuses
          const [approvedSnapshot, approvedUsernameSnapshot] = await Promise.all([
            adminDb.collection('users')
              .where('status', '==', 'approved')
              .orderBy('createdAt', 'desc')
              .limit(input.limit)
              .get(),
            adminDb.collection('users')
              .where('status', '==', 'approved_username_assigned')
              .orderBy('createdAt', 'desc')
              .limit(input.limit)
              .get()
          ]);
          
          const allApprovedUsers = [...approvedSnapshot.docs, ...approvedUsernameSnapshot.docs]
            .sort((a, b) => {
              const aTime = a.data().createdAt?.seconds || 0;
              const bTime = b.data().createdAt?.seconds || 0;
              return bTime - aTime;
            })
            .slice(0, input.limit);
          
          const users = allApprovedUsers.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              email: data.email,
              phone: data.phone,
              location: data.location,
              status: data.status,
              username: data.username,
              selfieUrl: data.selfieUrl,
              createdAt: data.createdAt,
              approvedAt: data.approvedAt,
              updatedAt: data.updatedAt,
            };
          });
          
          return {
            users,
            count: users.length,
          };
        } else {
          query = query.where('status', '==', input.status);
        }
      }
      
      // Execute query (only if not handled above for approved status)
      const snapshot = await query.get();
      
      const users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          location: data.location,
          status: data.status,
          username: data.username,
          selfieUrl: data.selfieUrl,
          createdAt: data.createdAt,
          approvedAt: data.approvedAt,
          updatedAt: data.updatedAt,
        };
      });
      
      console.log('Retrieved users successfully:', { count: users.length });
      
      return {
        users,
        count: users.length,
      };
    } catch (error) {
      console.error('Get all users error:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get users. Please try again.'
      });
    }
  });

export const updateUserStatusProcedure = adminProcedure
  .input(updateUserStatusSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      console.log('Update user status attempt:', { userId: input.userId, status: input.status });
      
      // Get current user data
      const userDoc = await adminDb.collection('users').doc(input.userId).get();
      
      if (!userDoc.exists) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        });
      }
      
      const userData = userDoc.data();
      const updateData: any = {
        status: input.status,
        updatedAt: new Date(),
      };
      
      // Generate username if approving and user doesn't have one
      if (input.status === 'approved') {
        if (!userData?.username) {
          updateData.username = await generateUniqueUsername(userData?.name || '');
        }
        updateData.status = 'approved_username_assigned';
        updateData.approvedAt = new Date();
      }
      
      // Add rejection reason if provided
      if (input.status === 'rejected' && input.reason) {
        updateData.rejectionReason = input.reason;
        updateData.rejectedAt = new Date();
      }
      
      // Update user document
      await adminDb.collection('users').doc(input.userId).update(updateData);
      
      // Log admin action
      await logAdminAction(
        `user_${input.status}`,
        input.userId,
        ctx.adminUser.uid || ctx.adminUser.email || 'unknown_admin',
        {
          previousStatus: userData?.status,
          newStatus: updateData.status,
          username: updateData.username,
          reason: input.reason,
          adminEmail: ctx.adminUser.email,
        }
      );
      
      console.log('User status updated successfully:', { userId: input.userId, status: input.status });
      
      const statusMessage = input.status === 'approved' 
        ? `User approved successfully! Username assigned: ${updateData.username || userData?.username}`
        : `User rejected successfully${input.reason ? ` (Reason: ${input.reason})` : ''}`;
      
      return {
        success: true,
        message: statusMessage,
        username: updateData.username || userData?.username,
        newStatus: updateData.status,
      };
    } catch (error) {
      console.error('Update user status error:', error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update user status. Please try again.'
      });
    }
  });

export const getPendingUsersProcedure = adminProcedure
  .query(async () => {
    try {
      console.log('Get pending users attempt');
      
      // Query users with pending verification status
      const snapshot = await adminDb.collection('users')
        .where('status', '==', 'pending_verification')
        .orderBy('createdAt', 'desc')
        .get();
      
      const users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          location: data.location,
          status: data.status,
          username: data.username,
          selfieUrl: data.selfieUrl,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      
      console.log('Retrieved pending users successfully:', { count: users.length });
      
      return {
        users,
        count: users.length,
      };
    } catch (error) {
      console.error('Get pending users error:', error);
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get pending users. Please try again.'
      });
    }
  });

export const getUserStatsProcedure = adminProcedure
  .query(async () => {
    try {
      console.log('Get user stats attempt');
      
      // Get counts for each status
      const [pendingSnapshot, approvedSnapshot, approvedUsernameSnapshot, rejectedSnapshot] = await Promise.all([
        adminDb.collection('users').where('status', '==', 'pending_verification').get(),
        adminDb.collection('users').where('status', '==', 'approved').get(),
        adminDb.collection('users').where('status', '==', 'approved_username_assigned').get(),
        adminDb.collection('users').where('status', '==', 'rejected').get(),
      ]);
      
      const stats = {
        pending: pendingSnapshot.size,
        approved: approvedSnapshot.size + approvedUsernameSnapshot.size,
        rejected: rejectedSnapshot.size,
        total: pendingSnapshot.size + approvedSnapshot.size + approvedUsernameSnapshot.size + rejectedSnapshot.size,
      };
      
      console.log('Retrieved user stats successfully:', stats);
      
      return stats;
    } catch (error) {
      console.error('Get user stats error:', error);
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user stats. Please try again.'
      });
    }
  });

// Get admin action logs procedure
export const getAdminActionsProcedure = adminProcedure
  .input(z.object({
    limit: z.number().min(1).max(100).optional().default(20),
    userId: z.string().optional(),
  }))
  .query(async ({ input }) => {
    try {
      console.log('Get admin actions attempt:', { limit: input.limit, userId: input.userId });
      
      // Build query
      let query = adminDb.collection('admin_actions')
        .orderBy('timestamp', 'desc')
        .limit(input.limit);
      
      // Filter by userId if provided
      if (input.userId) {
        query = query.where('userId', '==', input.userId);
      }
      
      // Execute query
      const snapshot = await query.get();
      
      const actions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          action: data.action,
          userId: data.userId,
          adminId: data.adminId,
          details: data.details,
          timestamp: data.timestamp,
          createdAt: data.createdAt,
        };
      });
      
      console.log('Retrieved admin actions successfully:', { count: actions.length });
      
      return {
        actions,
        count: actions.length,
      };
    } catch (error) {
      console.error('Get admin actions error:', error);
      
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get admin actions. Please try again.'
      });
    }
  });