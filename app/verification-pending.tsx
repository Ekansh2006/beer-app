import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { Clock } from 'lucide-react-native';
import { router } from 'expo-router';

import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';

export default function VerificationPendingScreen() {
  const { user, logout, isUserApproved } = useUser();

  useEffect(() => {
    console.log('[verification-pending] status check', {
      hasUser: !!user,
      isUserApproved,
      status: user?.status ?? null,
    });
    if (isUserApproved) {
      router.replace('/welcome');
    }
  }, [isUserApproved, user]);

  const handleLogout = () => {
    try {
      logout();
    } catch (e) {
      console.log('[verification-pending] logout error', e);
    } finally {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="verificationPendingScreen">
      <View style={styles.centerWrap}>
        <View style={styles.iconBadge}>
          <Clock size={40} color={Colors.light.text} />
        </View>

        <Text style={styles.title} accessibilityRole="header">Account under review</Text>
        <Text style={styles.subtitle}>
          Thanks for signing up. Our team is verifying your submission. You will be notified once you are approved.
        </Text>

        <View style={styles.meta}>
          <Text style={styles.metaText}>Typical review time: 24–48 hours</Text>
          <Text style={styles.metaText}>We will email you your username after approval</Text>
        </View>
      </View>

      <TouchableOpacity
        testID="logoutButton"
        accessibilityLabel="Logout"
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: Colors.light.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 10,
    textTransform: 'none' as const,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  meta: {
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '400' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: Colors.light.text,
    textAlign: 'center',
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: Colors.light.text,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    color: Colors.light.text,
  },
});