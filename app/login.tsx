import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';

import Colors from '@/constants/colors';
import FormInput from '@/components/FormInput';
import { useUser } from '@/contexts/UserContext';
import { LoginData } from '@/types/profile';

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen() {
  const { login, isLoading } = useUser();
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'email is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof LoginData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    const emailLc = formData.email.trim().toLowerCase();
    const pass = formData.password;

    // Check for admin credentials and authenticate through Firebase
    if (emailLc === 'admin@gmail.com' && pass === 'ekansh68') {
      try {
        // Authenticate admin through Firebase first
        await login(formData);
        router.replace('/admin-dashboard');
        return;
      } catch (e) {
        console.error('Admin authentication error:', e);
        Alert.alert('Admin Login Failed', 'Invalid admin credentials or admin account not set up properly.');
        return;
      }
    }

    try {
      const user = await login(formData);

      if (user.status === 'pending_verification') {
        router.replace('/verification-pending');
      } else if (user.status === 'approved_username_assigned') {
        router.replace('/(tabs)');
      } else if (user.status === 'rejected') {
        router.replace('/account-rejected');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('login failed', 'invalid email or password. please try again.');
    }
  };

  const handleRegister = () => {
    router.push('/register');
  };

  const isFormValid = () => {
    return (
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) &&
      formData.password.length > 0 &&
      Object.keys(errors).length === 0
    );
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
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <BeerLogo />
            <Text style={styles.appTitle}>beer</Text>
          </View>
        </View>
        
        <View style={styles.content}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>welcome back</Text>
            <Text style={styles.subtitle}>
              sign in to your account
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.section}>
            <FormInput
              label="email"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="enter your email address"
              error={errors.email}
              required
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <View style={styles.passwordContainer}>
              <FormInput
                label="password"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                placeholder="enter your password"
                error={errors.password}
                required
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.light.text} />
                ) : (
                  <Eye size={20} color={Colors.light.text} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.loginButton,
              (!isFormValid() || isLoading) && styles.loginButtonDisabled
            ]}
            onPress={handleLogin}
            disabled={!isFormValid() || isLoading}
            activeOpacity={0.8}
          >
            <LogIn size={20} color={isFormValid() && !isLoading ? Colors.light.text : Colors.light.tabIconDefault} />
            <Text style={[
              styles.loginButtonText,
              (!isFormValid() || isLoading) && styles.loginButtonTextDisabled
            ]}>
              {isLoading ? 'signing in...' : 'sign in'}
            </Text>
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerSection}>
            <Text style={styles.registerText}>don&apos;t have an account?</Text>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              activeOpacity={0.8}
            >
              <UserPlus size={16} color={Colors.light.text} />
              <Text style={styles.registerButtonText}>create account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardContainer: {
    flex: 1,
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
    padding: 20,
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 44,
    padding: 8,
    zIndex: 1,
  },
  loginButton: {
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
    marginBottom: 32,
    minHeight: 52,
  },
  loginButtonDisabled: {
    backgroundColor: Colors.light.background,
    opacity: 0.5,
  },
  loginButtonText: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  loginButtonTextDisabled: {
    color: Colors.light.text,
  },
  registerSection: {
    alignItems: 'center',
    gap: 16,
  },
  registerText: {
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
  },
  registerButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  registerButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
});