import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Camera, Check, X, User } from 'lucide-react-native';
import { router } from 'expo-router';

import Colors from '@/constants/colors';
import FormInput from '@/components/FormInput';
import SelfieCamera from '@/components/SelfieCamera';
import { useUser } from '@/contexts/UserContext';
import { RegistrationData } from '@/types/profile';

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  password?: string;
  confirmPassword?: string;
  selfieUri?: string;
}

export default function RegistrationScreen() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 60;
  const { register, isRegistering } = useUser();
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [formData, setFormData] = useState<RegistrationData>({
    name: '',
    email: '',
    phone: '',
    location: '',
    password: '',
    confirmPassword: '',
    selfieUri: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'name must be less than 50 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'email is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'please enter a valid email address';
    }

    // Phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'phone number is required';
    } else if (!phoneRegex.test(formData.phone.trim().replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'please enter a valid phone number';
    }

    // Location validation
    if (!formData.location.trim()) {
      newErrors.location = 'location is required';
    } else if (formData.location.trim().length < 2) {
      newErrors.location = 'location must be at least 2 characters';
    } else if (formData.location.trim().length > 100) {
      newErrors.location = 'location must be less than 100 characters';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'password must be at least 8 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'passwords do not match';
    }

    // Selfie validation
    if (!formData.selfieUri) {
      newErrors.selfieUri = 'verification selfie is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof RegistrationData, value: string) => {
    console.log('[register] handleInputChange', field, value?.toString()?.slice(0, 8));
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev } as FormErrors;
        delete (next as any)[field];
        return next;
      });
    }
  };

  const handleSelfieCapture = (selfie: { uri: string }) => {
    setFormData(prev => ({ ...prev, selfieUri: selfie.uri }));
    setShowCamera(false);
    if (errors.selfieUri) {
      setErrors(prev => ({ ...prev, selfieUri: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      console.log('[register] form validation failed', errors);
      return;
    }

    try {
      console.log('[register] submitting registration', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        hasSelfie: !!formData.selfieUri
      });
      
      const user = await register(formData);
      console.log('[register] registration success, user:', user);
      console.log('[register] navigating to pending screen');
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        router.replace('/verification-pending');
      }, 100);
    } catch (error) {
      console.error('[register] Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account. Please try again.';
      Alert.alert('Registration Error', errorMessage);
    }
  };

  const handleCancel = () => {
    router.replace('/login');
  };

  const isFormValid = () => {
    const nameOk = formData.name.trim().length >= 2 && formData.name.trim().length <= 50;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
    const phoneOk = /^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.trim().replace(/[\s\-\(\)]/g, ''));
    const locationOk = formData.location.trim().length >= 2 && formData.location.trim().length <= 100;
    const pwOk = formData.password.length >= 8 && formData.password === formData.confirmPassword;
    const selfieOk = !!formData.selfieUri;
    const valid = nameOk && emailOk && phoneOk && locationOk && pwOk && selfieOk;
    return valid;
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

  if (showCamera) {
    return (
      <SelfieCamera
        onCapture={handleSelfieCapture}
        onCancel={() => setShowCamera(false)}
      />
    );
  }

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
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton} testID="register-cancel">
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSubmit} 
              testID="register-header-submit"
              style={[
                styles.headerButton,
                (!isFormValid() || isRegistering) && styles.headerButtonDisabled
              ]}
              disabled={!isFormValid() || isRegistering}
            >
              <Check 
                size={24} 
                color={isFormValid() && !isRegistering ? Colors.light.text : Colors.light.tabIconDefault} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleSection}>
            <Text style={styles.title}>create account</Text>
            <Text style={styles.subtitle}>
              join the men-only beer community
            </Text>
          </View>

          {/* Selfie Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>verification selfie *</Text>
            <TouchableOpacity 
              style={[
                styles.selfieContainer,
                errors.selfieUri && styles.selfieContainerError
              ]}
              onPress={() => setShowCamera(true)}
              activeOpacity={0.7}
            >
              {formData.selfieUri ? (
                <Image
                  source={{ uri: formData.selfieUri }}
                  style={styles.selfiePreview}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.selfiePlaceholder}>
                  <User size={48} color={Colors.light.tabIconDefault} />
                  <Text style={styles.selfiePlaceholderText}>take verification selfie</Text>
                  <View style={styles.selfieInstructions}>
                    <Text style={styles.selfieInstructionText}>• clear face photo required</Text>
                    <Text style={styles.selfieInstructionText}>• for men-only verification</Text>
                    <Text style={styles.selfieInstructionText}>• camera only (no gallery)</Text>
                  </View>
                  <View style={styles.cameraIcon}>
                    <Camera size={20} color={Colors.light.tabIconDefault} />
                    <Text style={styles.cameraIconText}>camera</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
            {errors.selfieUri && <Text style={styles.errorText}>{errors.selfieUri}</Text>}
          </View>

          {/* Form Fields */}
          <View style={styles.section}>
            <FormInput
              label="name"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="enter your full name"
              error={errors.name}
              required
              maxLength={50}
              autoCapitalize="words"
              returnKeyType="next"
            />

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

            <FormInput
              label="phone"
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              placeholder="enter your phone number"
              error={errors.phone}
              required
              keyboardType="phone-pad"
              returnKeyType="next"
            />

            <FormInput
              label="location"
              value={formData.location}
              onChangeText={(value) => handleInputChange('location', value)}
              placeholder="enter your city/location"
              error={errors.location}
              required
              maxLength={100}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <FormInput
              label="password"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              placeholder="create a password (min 8 characters)"
              error={errors.password}
              required
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <FormInput
              label="confirm password"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              placeholder="confirm your password"
              error={errors.confirmPassword}
              required
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimerContainer}>
            <Text style={styles.disclaimerText}>
              your account will be reviewed by our team. username will be assigned after approval.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isFormValid() || isRegistering) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isRegistering}
            activeOpacity={0.8}
            testID="register-submit"
          >
            <Text style={[
              styles.submitButtonText,
              (!isFormValid() || isRegistering) && styles.submitButtonTextDisabled
            ]}>
              {isRegistering ? 'creating account...' : 'create account'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
    fontSize: 28,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textTransform: 'lowercase' as const,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 8,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    marginBottom: 12,
  },
  selfieContainer: {
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000000',
    overflow: 'hidden',
  },
  selfieContainerError: {
    borderColor: '#000000',
    backgroundColor: Colors.light.background,
  },
  selfiePreview: {
    width: '100%',
    height: '100%',
  },
  selfiePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    gap: 12,
  },
  selfiePlaceholderText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  selfieInstructions: {
    alignItems: 'center',
    gap: 4,
  },
  selfieInstructionText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  cameraIcon: {
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  cameraIconText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  disclaimerContainer: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  disclaimerText: {
    fontSize: 14,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    minHeight: 52,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.light.background,
    opacity: 0.5,
  },
  submitButtonText: {
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  submitButtonTextDisabled: {
    color: Colors.light.text,
  },
  errorText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    marginTop: 4,
  },
});