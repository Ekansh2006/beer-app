import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, Component, ReactNode, useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";

import { ProfilesProvider } from "@/contexts/ProfilesContext";
import { UserProvider, useUser } from "@/contexts/UserContext";
import Colors from "@/constants/colors";
import { useUserRole } from "@/lib/userRoles";

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.light.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    lineHeight: 24,
  },
});

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    padding: 24,
  },
  message: {
    marginTop: 12,
    color: Colors.light.tabIconDefault,
  },
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="verification-pending" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
    </Stack>
  );
}

function AuthGate() {
  const { isLoading, user, isUserApproved, isUserPending } = useUser();
  const { loading: roleLoading, isAdmin } = useUserRole();
  const statusText = useMemo(() => {
    if (isLoading || roleLoading) return "Checking session...";
    if (!user) return "No session";
    if (isUserPending) return "Pending verification";
    if (isUserApproved) return isAdmin ? "Approved (admin)" : "Approved";
    return "Authenticated";
  }, [isLoading, roleLoading, user, isUserApproved, isUserPending, isAdmin]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={loadingStyles.container} testID="auth-loading">
        <ActivityIndicator size="large" color={Colors.light.text} />
        <Text style={loadingStyles.message}>{statusText}</Text>
      </View>
    );
  }

  return <RootLayoutNav />;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <ProfilesProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <AuthGate />
            </GestureHandlerRootView>
          </ProfilesProvider>
        </UserProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
