import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { XCircle, Mail, ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';

import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';

export default function AccountRejectedScreen() {
  const { logout } = useUser();

  const handleContactSupport = () => {
    // You can implement email functionality here or redirect to a contact form
    console.log('Contact support pressed');
  };

  const handleBackToLogin = async () => {
    await logout();
    router.replace('/login');
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.logoSection}>
          <BeerLogo />
          <Text style={styles.appTitle}>beer</Text>
        </View>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.content}>
        {/* Rejection Icon */}
        <View style={styles.iconContainer}>
          <XCircle size={80} color="#F44336" />
        </View>

        {/* Title and Message */}
        <View style={styles.messageSection}>
          <Text style={styles.title}>account rejected</Text>
          <Text style={styles.message}>
            unfortunately, your account application was not approved at this time.
          </Text>
          <Text style={styles.submessage}>
            this decision was made after careful review of your submitted information.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.supportButton}
            onPress={handleContactSupport}
            activeOpacity={0.8}
          >
            <Mail size={20} color={Colors.light.text} />
            <Text style={styles.supportButtonText}>contact support</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButtonStyle}
            onPress={handleBackToLogin}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color={Colors.light.text} />
            <Text style={styles.backButtonText}>back to login</Text>
          </TouchableOpacity>
        </View>

        {/* Additional Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            if you believe this decision was made in error, please contact our support team for further assistance.
          </Text>
        </View>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  backButton: {
    padding: 8,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textTransform: 'lowercase' as const,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  messageSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  submessage: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionSection: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  supportButton: {
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
    minHeight: 52,
  },
  supportButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  backButtonStyle: {
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
    minHeight: 52,
  },
  backButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  infoSection: {
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    lineHeight: 18,
  },
});