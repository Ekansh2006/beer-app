import { createTRPCRouter } from "./create-context";
import { registerProcedure } from "./routes/auth/register";
import { loginProcedure, adminLoginProcedure } from "./routes/auth/login";
import { uploadSelfieProcedure as photosUploadSelfieProcedure, updateUserStatusProcedure } from "./routes/photos/upload";
import { getUserProcedure, getAllUsersProcedure, updateUserStatusProcedure as usersUpdateUserStatusProcedure, getPendingUsersProcedure, getUserStatsProcedure, getAdminActionsProcedure } from "./routes/users/management";
import { uploadSelfieProcedure as authUploadSelfieProcedure } from "./routes/auth/upload-selfie";
import { createProfileProcedure } from "./routes/profiles/create";

export const appRouter = createTRPCRouter({
  auth: createTRPCRouter({
    register: registerProcedure,
    login: loginProcedure,
    adminLogin: adminLoginProcedure,
    uploadSelfie: authUploadSelfieProcedure,
  }),
  photos: createTRPCRouter({
    uploadSelfie: photosUploadSelfieProcedure,
    updateUserStatus: updateUserStatusProcedure,
  }),
  users: createTRPCRouter({
    getUser: getUserProcedure,
    getAllUsers: getAllUsersProcedure,
    updateStatus: usersUpdateUserStatusProcedure,
    getPending: getPendingUsersProcedure,
    getStats: getUserStatsProcedure,
    getAdminActions: getAdminActionsProcedure,
  }),
  profiles: createTRPCRouter({
    create: createProfileProcedure,
  }),
});

export type AppRouter = typeof appRouter;