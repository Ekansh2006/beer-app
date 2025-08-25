import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { adminAuth } from "../lib/firebase-admin";

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const authHeader = opts.req.headers.get('authorization');
  let adminUser = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decodedToken = await adminAuth.verifyIdToken(token);
      adminUser = decodedToken;
    } catch (error) {
      console.error('Token verification failed:', error);
      // Don't throw error here, let procedures handle auth
    }
  }
  
  return {
    req: opts.req,
    adminUser,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Admin role check middleware
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.adminUser) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Admin authentication required',
    });
  }
  
  // Check if user has admin role
  const adminEmails = [
    'admin@gmail.com',
    // Add more admin emails as needed
  ];
  
  const userEmail = ctx.adminUser.email?.toLowerCase();
  if (!userEmail || !adminEmails.includes(userEmail)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin privileges required',
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      adminUser: ctx.adminUser,
    },
  });
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const adminProcedure = t.procedure.use(isAdmin);