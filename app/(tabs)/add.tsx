import React, { useState, useEffect } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon, Check, X, UserPlus } from 'lucide-react-native';
import { router } from 'expo-router';


import Colors from '@/constants/colors';
import FormInput from '@/components/FormInput';
import { useProfiles } from '@/contexts/ProfilesContext';
import { useUser } from '@/contexts/UserContext';
import { uploadImageToCloudinary } from '@/lib/cloudinary';

interface FormData {
  name: string;
  age: string;
  location: string;
  description: string;
  imageUri: string;
}

interface FormErrors {
  name?: string;
  age?: string;
  location?: string;
  description?: string;
  imageUri?: string;
}

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 60;
  const { addProfile } = useProfiles();
  const { user, isUserApproved, isUserPending } = useUser();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    age: '',
    location: '',
    description: '',
    imageUri: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      router.replace('/register');
    } else if (isUserPending) {
      router.replace('/verification-pending');
    } else if (!isUserApproved) {
      router.replace('/(tabs)');
    }
  }, [user, isUserApproved, isUserPending]);

  // Show loading or redirect if user is not approved
  if (!user || !isUserApproved) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.redirectContainer}>
          <UserPlus size={64} color={Colors.light.text} />
          <Text style={styles.redirectTitle}>account required</Text>
          <Text style={styles.redirectMessage}>
            you need an approved account to add profiles
          </Text>
          <TouchableOpacity
            style={styles.redirectButton}
            onPress={() => router.replace('/register')}
            activeOpacity={0.8}
          >
            <Text style={styles.redirectButtonText}>create account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Name must be less than 50 characters';
    }

    if (!formData.age.trim()) {
      newErrors.age = 'Age is required';
    } else {
      const ageNum = parseInt(formData.age);
      if (isNaN(ageNum) || ageNum < 10 || ageNum > 95) {
        newErrors.age = 'Age must be between 10 and 95';
      }
    }

    if (!formData.location.trim()) {
      newErrors.location = 'City is required';
    } else if (formData.location.trim().length < 2) {
      newErrors.location = 'City must be at least 2 characters';
    }

    if (formData.description.length > 150) {
      newErrors.description = 'Description must be less than 150 characters';
    }

    if (!formData.imageUri) {
      newErrors.imageUri = 'Photo is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert(
          'permissions required',
          'please grant camera and photo library permissions to add photos.',
          [{ text: 'ok' }]
        );
        return false;
      }
    }
    return true;
  };

  const pickImageFromCamera = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleInputChange('imageUri', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image from camera:', error);
      Alert.alert('error', 'failed to take photo. please try again.');
    }
  };

  const pickImageFromGallery = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleInputChange('imageUri', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image from gallery:', error);
      Alert.alert('error', 'failed to select photo. please try again.');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'select photo',
      'choose how you want to add a photo',
      [
        { text: 'take photo', onPress: pickImageFromCamera },
        { text: 'choose from gallery', onPress: pickImageFromGallery },
        { text: 'cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const ageNum = parseInt(formData.age, 10);

      let uploadedUrl = formData.imageUri;
      try {
        uploadedUrl = await uploadImageToCloudinary(formData.imageUri);
      } catch (e) {
        console.error('cloudinary upload failed, using local uri fallback', e);
      }

      const newProfile = {
        name: formData.name.trim(),
        age: ageNum,
        city: formData.location.trim(),
        description: formData.description.trim() || `${formData.name} from ${formData.location}`,
        profileImageUrl: uploadedUrl,
        uploaderUserId: user?.id ?? 'anonymous',
        uploaderUsername: (user as any)?.username ?? user?.name ?? 'you',
      };

      await addProfile(newProfile);
      
      Alert.alert(
        'success!',
        'profile added successfully',
        [
          {
            text: 'ok',
            onPress: () => {
              router.replace('/(tabs)');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error adding profile:', error);
      Alert.alert('error', 'failed to add profile. please try again.');
    } finally {
      setIsSubmitting(false);
    }
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

  const handleCancel = () => {
    router.replace('/(tabs)');
  };

  const isFormValid = () => {
    return (
      formData.name.trim().length >= 2 &&
      formData.name.trim().length <= 50 &&
      formData.location.trim().length >= 2 &&
      formData.age.trim() &&
      !isNaN(parseInt(formData.age)) &&
      parseInt(formData.age) >= 10 &&
      parseInt(formData.age) <= 95 &&
      formData.description.length <= 150 &&
      formData.imageUri &&
      Object.keys(errors).length === 0
    );
  };

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
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleSubmit} 
            style={[
              styles.headerButton,
              (!isFormValid() || isSubmitting) && styles.headerButtonDisabled
            ]}
            disabled={!isFormValid() || isSubmitting}
          >
            <Check 
              size={24} 
              color={isFormValid() && !isSubmitting ? Colors.light.primary : Colors.light.tabIconDefault} 
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
        {/* Photo Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>photo *</Text>
          <TouchableOpacity 
            style={[
              styles.photoContainer,
              errors.imageUri && styles.photoContainerError
            ]}
            onPress={showImagePickerOptions}
            activeOpacity={0.7}
          >
            {formData.imageUri ? (
              <Image
                source={{ uri: formData.imageUri }}
                style={styles.photoPreview}
                contentFit="cover"
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <ImageIcon size={48} color={Colors.light.tabIconDefault} />
                <Text style={styles.photoPlaceholderText}>tap to add photo</Text>
                <View style={styles.photoOptions}>
                  <View style={styles.photoOption}>
                    <Camera size={20} color={Colors.light.tabIconDefault} />
                    <Text style={styles.photoOptionText}>camera</Text>
                  </View>
                  <Text style={styles.photoOptionSeparator}>or</Text>
                  <View style={styles.photoOption}>
                    <ImageIcon size={20} color={Colors.light.tabIconDefault} />
                    <Text style={styles.photoOptionText}>gallery</Text>
                  </View>
                </View>
              </View>
            )}
          </TouchableOpacity>
          {errors.imageUri && <Text style={styles.errorText}>{errors.imageUri}</Text>}
        </View>

        {/* Form Fields */}
        <View style={styles.section}>
          <FormInput
            label="name"
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="name"
            error={errors.name}
            required
            maxLength={50}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <FormInput
            label="age"
            value={formData.age}
            onChangeText={(value) => handleInputChange('age', value)}
            placeholder="age"
            error={errors.age}
            required
            keyboardType="numeric"
            maxLength={2}
            returnKeyType="next"
          />

          <FormInput
            label="city"
            value={formData.location}
            onChangeText={(value) => handleInputChange('location', value)}
            placeholder="city"
            error={errors.location}
            required
            autoCapitalize="words"
            returnKeyType="next"
          />

          <FormInput
            label="description"
            value={formData.description}
            onChangeText={(value) => handleInputChange('description', value)}
            placeholder="COmment about it"
            error={errors.description}
            multiline
            numberOfLines={4}
            maxLength={150}
            characterCount={formData.description.length}
            style={styles.textArea}
            returnKeyType="done"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isFormValid() || isSubmitting) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid() || isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.submitButtonText,
            (!isFormValid() || isSubmitting) && styles.submitButtonTextDisabled
          ]}>
            {isSubmitting ? 'adding profile...' : 'add profile'}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 8,
  },
  headerButtonDisabled: {
    opacity: 0.5,
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
  photoContainer: {
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000000',
    overflow: 'hidden',
  },
  photoContainerError: {
    borderColor: '#000000',
    backgroundColor: Colors.light.background,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    gap: 12,
  },
  photoPlaceholderText: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  photoOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  photoOption: {
    alignItems: 'center',
    gap: 4,
  },
  photoOptionText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  photoOptionSeparator: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
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
  redirectContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  redirectTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  redirectMessage: {
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  redirectButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  redirectButtonText: {
    fontSize: 18,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
  },
});