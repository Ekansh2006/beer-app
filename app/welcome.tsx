import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { CheckCircle, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';

import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';

export default function WelcomeScreen() {
  const { user } = useUser();

  const handleGetStarted = () => {
    router.replace('/(tabs)');
  };

  const BeerLogo = () => (
    <View style={styles.logoContainer}>
      <Image 
        source={{ uri: 'https://r2-pub.rork.com/attachments/bcjlgxvpsdw5ajmunl9az' }}
        style={styles.logoImage}
        contentFit="contain"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoSection}>
          <BeerLogo />
          <Text style={styles.appTitle}>beer</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        testID="welcomeScroll"
        onScrollBeginDrag={() => console.log('[WelcomeScreen] scroll start')}
      >
        <View style={styles.welcomeContainer}>
          <View style={styles.iconContainer}>
            <CheckCircle size={80} color={Colors.light.text} />
          </View>

          <Text style={styles.title}>welcome to beer!</Text>

          <Text style={styles.subtitle}>
            your account has been verified and approved
          </Text>

          <View style={styles.usernameContainer}>
            <Text style={styles.usernameLabel}>your username:</Text>
            <Text style={styles.username}>@{user?.username ?? 'username'}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>you&apos;re now part of the community!</Text>
            <Text style={styles.infoText}>
              • browse and discover profiles from verified men
            </Text>
            <Text style={styles.infoText}>
              • add your own profile photos and descriptions
            </Text>
            <Text style={styles.infoText}>
              • vote with green or red flags on profiles
            </Text>
            <Text style={styles.infoText}>
              • comment and interact with the community
            </Text>
            <Text style={styles.infoText}>
              • search and filter profiles by location
            </Text>
          </View>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>community guidelines:</Text>
            <Text style={styles.tipsText}>
              • be respectful and authentic in all interactions
            </Text>
            <Text style={styles.tipsText}>
              • only upload clear, appropriate photos
            </Text>
            <Text style={styles.tipsText}>
              • use your assigned username for all activities
            </Text>
            <Text style={styles.tipsText}>
              • report any inappropriate content or behavior
            </Text>
          </View>

          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
            testID="getStartedButton"
          >
            <Text style={styles.getStartedButtonText}>get started</Text>
            <ArrowRight size={20} color={Colors.light.text} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textTransform: 'lowercase' as const,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  welcomeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 32,
  },
  usernameContainer: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  usernameLabel: {
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    marginBottom: 8,
  },
  username: {
    fontSize: 24,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
  },
  infoContainer: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    width: '100%',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  tipsContainer: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 20,
    width: '100%',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  tipsText: {
    fontSize: 12,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    lineHeight: 18,
    marginBottom: 6,
  },
  getStartedButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  getStartedButtonText: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
});