import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { auth } from '@/lib/firebase';

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).location?.origin) {
    return window.location.origin;
  }

  const expoGoConfig = (Constants as any)?.expoGoConfig;
  const manifest = (Constants as any)?.manifest;
  const debuggerHost: string | undefined = expoGoConfig?.debuggerHost ?? manifest?.debuggerHost;
  if (debuggerHost && typeof debuggerHost === 'string') {
    const host = debuggerHost.split(':')[0];
    if (host) {
      return `http://${host}:3000`;
    }
  }

  return 'http://localhost:3000';
};

const baseUrl = `${getBaseUrl()}/api/trpc`;
console.log('[trpc] Base URL:', baseUrl);

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: baseUrl,
      transformer: superjson,
      headers: async () => {
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          return {
            authorization: `Bearer ${token}`,
          };
        }
        return {};
      },
    }),
  ],
});
