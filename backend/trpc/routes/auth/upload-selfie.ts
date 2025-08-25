import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { adminAuth, adminDb } from "../../../lib/firebase-admin";
import { TRPCError } from "@trpc/server";
import { uploadUserSelfie } from "../../../lib/cloudinary-config";

const inputSchema = z.object({
  userId: z.string().min(1),
  imageBase64: z.string().min(1),
});

export const uploadSelfieProcedure = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    try {
      console.log("[auth.upload-selfie] start", { userId: input.userId });

      const userRecord = await adminAuth.getUser(input.userId);
      if (!userRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const userRef = adminDb.collection("users").doc(input.userId);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User profile not found" });
      }

      const buffer = Buffer.from(input.imageBase64, "base64");

      const approxBytes = buffer.byteLength;
      const maxBytes = 1_000_000;
      if (approxBytes > maxBytes) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Image too large. Please retake with lower quality." });
      }

      const { url } = await uploadUserSelfie(buffer, input.userId, {
        verificationStatus: "pending_verification",
      });

      await userRef.update({
        selfieUrl: url,
        verificationStatus: "pending_verification",
        status: "pending_verification",
        selfieSubmittedAt: new Date(),
        updatedAt: new Date(),
      });

      await adminDb.collection("admin_notifications").add({
        type: "selfie_submitted",
        userId: input.userId,
        selfieUrl: url,
        createdAt: new Date(),
        read: false,
      });

      console.log("[auth.upload-selfie] success", { userId: input.userId, url });

      return { success: true, selfieUrl: url };
    } catch (err) {
      console.error("[auth.upload-selfie] error", err);
      if (err instanceof TRPCError) throw err;

      if (err && typeof err === "object" && "code" in err) {
        const e = err as { code: string; message: string };
        switch (e.code) {
          case "auth/user-not-found":
            throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
          default:
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to upload selfie" });
        }
      }

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to upload selfie" });
    }
  });
