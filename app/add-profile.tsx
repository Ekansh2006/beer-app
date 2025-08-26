import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useUser } from '@/contexts/UserContext';
import Colors from '@/constants/colors';
import { Camera, ImageIcon, UploadCloud, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import FormInput from '@/components/FormInput';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface FormState {
  name: string;
  age: string;
  city: string;
  description: string;
}

interface FormErrors {
  name?: string;
  age?: string;
  city?: string;
  description?: string;
  photo?: string;
}

interface UploadState {
  step: 'idle' | 'picking' | 'validating' | 'uploading' | 'success' | 'error';
  message?: string;
}

const MAX_SIZE_BYTES = 1_000_000;

function ErrorBoundaryContainer({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const reset = useCallback(() => setError(null), []);
  if (error) {
    return (
      <View style={styles.errorBoundary} testID="error-boundary">
        <AlertCircle color={'#ef4444'} size={24} />
        <Text style={styles.errorBoundaryTitle}>Something went wrong</Text>
        <Text style={styles.errorBoundaryMsg}>{error}</Text>
        <TouchableOpacity style={[styles.button, styles.primaryBtn]} onPress={reset}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View
      onLayout={() => {
        try {
          // noop
        } catch (e: any) {
          setError(e?.message ?? 'Unknown error');
        }
      }}
      style={{ flex: 1 }}
    >
      {children}
    </View>
  );
}

export default function AddProfileScreen() {
  const { user } = useUser();
  const [form, setForm] = useState<FormState>({ name: '', age: '', city: '', description: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>({ step: 'idle' });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const validate = useCallback((): boolean => {
    const next: FormErrors = {};
    
    // Name validation
    const nameValue = form.name.trim();
    if (!nameValue) {
      next.name = 'Name is required';
    } else if (nameValue.length < 2) {
      next.name = 'Name must be at least 2 characters';
    } else if (nameValue.length > 50) {
      next.name = 'Name must be less than 50 characters';
    } else if (!/^[a-zA-Z\s'-]+$/.test(nameValue)) {
      next.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    
    // Age validation
    const ageValue = form.age.trim();
    if (!ageValue) {
      next.age = 'Age is required';
    } else if (isNaN(Number(ageValue))) {
      next.age = 'Age must be a valid number';
    } else {
      const ageNum = Number(ageValue);
      if (!Number.isInteger(ageNum)) {
        next.age = 'Age must be a whole number';
      } else if (ageNum < 18) {
        next.age = 'Must be at least 18 years old';
      } else if (ageNum > 95) {
        next.age = 'Age must be less than 95';
      }
    }
    
    // City validation
    const cityValue = form.city.trim();
    if (!cityValue) {
      next.city = 'City is required';
    } else if (cityValue.length < 2) {
      next.city = 'City must be at least 2 characters';
    } else if (cityValue.length > 100) {
      next.city = 'City must be less than 100 characters';
    } else if (!/^[a-zA-Z\s,.-]+$/.test(cityValue)) {
      next.city = 'City can only contain letters, spaces, commas, periods, and hyphens';
    }
    
    // Description validation
    const descValue = form.description?.trim() || '';
    if (descValue.length > 300) {
      next.description = 'Description must be less than 300 characters';
    }
    
    // Photo validation
    if (!imageBase64) {
      next.photo = 'Profile photo is required';
    }
    
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, imageBase64]);

  const onChange = useCallback((key: keyof FormState, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }, [errors]);

  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (cam.status !== 'granted' || lib.status !== 'granted') {
        Alert.alert('Permissions needed', 'Please allow camera and photos access.');
        return false;
      }
    }
    return true;
  }, []);

  const handlePick = useCallback(async (source: 'camera' | 'library') => {
    const ok = await requestPermissions();
    if (!ok) return;
    try {
      setState({ step: 'picking', message: 'Opening...' });
      const picker = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await picker({ allowsEditing: true, aspect: [1, 1], quality: 0.85, base64: true, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      if (result.canceled) { setState({ step: 'idle' }); return; }
      const asset = result.assets?.[0];
      if (!asset) { setState({ step: 'error', message: 'No image selected' }); return; }
      setPhotoPreview(asset.uri ?? null);
      const b64 = asset.base64 ?? null;
      if (!b64) { setState({ step: 'error', message: 'Failed to read image data' }); return; }
      setState({ step: 'validating', message: 'Validating photo...' });
      
      // Calculate actual file size
      const approxBytes = Math.ceil((b64.length * 3) / 4);
      if (approxBytes > MAX_SIZE_BYTES) {
        setState({ step: 'error', message: 'Image too large. Maximum size is 1MB.' });
        return;
      }
      
      // Check minimum size
      if (approxBytes < 1000) {
        setState({ step: 'error', message: 'Image too small. Please upload a valid photo.' });
        return;
      }
      
      // Basic format validation
      try {
        const buffer = Buffer.from(b64, 'base64');
        const jpegHeader = buffer.subarray(0, 3);
        const pngHeader = buffer.subarray(0, 8);
        
        const isJPEG = jpegHeader[0] === 0xFF && jpegHeader[1] === 0xD8 && jpegHeader[2] === 0xFF;
        const isPNG = pngHeader[0] === 0x89 && pngHeader[1] === 0x50 && pngHeader[2] === 0x4E && pngHeader[3] === 0x47;
        
        if (!isJPEG && !isPNG) {
          setState({ step: 'error', message: 'Invalid image format. Only JPEG and PNG are supported.' });
          return;
        }
      } catch {
        setState({ step: 'error', message: 'Invalid image data. Please try another photo.' });
        return;
      }
      setImageBase64(b64);
      setErrors((e) => ({ ...e, photo: undefined }));
      setState({ step: 'idle' });
    } catch (e: any) {
      setState({ step: 'error', message: e?.message ?? 'Image picker failed' });
    }
  }, [requestPermissions]);

  const onSubmit = useCallback(() => {
    // Check if user is logged in
    if (!user?.id) { 
      Alert.alert('Login Required', 'Please login to continue'); 
      return; 
    }
    
    // Check if user is verified (only verified users can create profiles)
    if (!user.username || user.status !== 'approved_username_assigned') {
      Alert.alert(
        'Verification Required', 
        'Only verified users with approved usernames can create profiles. Please complete verification first.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Validate form
    if (!validate()) return;
    
    // Double-check image
    if (!imageBase64) { 
      setErrors((e) => ({ ...e, photo: 'Profile photo is required' })); 
      return; 
    }
    
    // Sanitize and submit data
    const sanitizedData = {
      userId: user.id,
      name: form.name.trim().replace(/\s+/g, ' '),
      age: Number(form.age.trim()),
      city: form.city.trim().replace(/\s+/g, ' '),
      description: form.description?.trim().replace(/\s+/g, ' ') || '',
      imageBase64,
    };
    
    (async () => {
      try {
        setIsSubmitting(true);
        setState({ step: 'uploading', message: 'Creating profile...' });
        const dataUrl = `data:image/jpeg;base64,${sanitizedData.imageBase64}`;
        const imageUrl = await uploadImageToCloudinary(dataUrl);
        await addDoc(collection(db, 'profiles'), {
          name: sanitizedData.name,
          age: sanitizedData.age,
          city: sanitizedData.city,
          description: sanitizedData.description,
          profileImageUrl: imageUrl,
          uploaderUserId: sanitizedData.userId,
          uploaderUsername: user.username ?? '',
          greenFlags: 0,
          redFlags: 0,
          commentCount: 0,
          approvalStatus: 'pending',
          createdAt: serverTimestamp(),
        });
        setState({ step: 'success', message: 'Profile created' });
        Alert.alert('Success', 'Profile created successfully', [
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ]);
      } catch (e: any) {
        setState({ step: 'error', message: e?.message ?? 'Failed to create profile' });
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [user, validate, imageBase64, form]);

  const disabled = useMemo(() => state.step === 'picking' || isSubmitting, [state.step, isSubmitting]);

  return (
    <ErrorBoundaryContainer>
      <Stack.Screen options={{ title: 'Add Profile', headerLeft: () => (
        <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 12 }}>
          <ChevronLeft size={20} color={Colors.light.text} />
        </TouchableOpacity>
      ) }} />

      <ScrollView contentContainerStyle={styles.container} testID="add-profile">
        <Text style={styles.title}>Create Profile</Text>
        <Text style={styles.subtitle}>Share basic info and a clear photo. Only verified users can create profiles.</Text>
        
        {user && user.status !== 'approved_username_assigned' && (
          <View style={styles.warningBox}>
            <AlertCircle color={'#f59e0b'} size={20} />
            <Text style={styles.warningText}>
              You need to complete verification before creating profiles. Please wait for admin approval.
            </Text>
          </View>
        )}

        <View style={styles.photoBox} testID="photo-box">
          {photoPreview ? (
            <Image source={{ uri: photoPreview }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <ImageIcon size={48} color={Colors.light.tabIconDefault} />
              <Text style={styles.placeholderText}>No photo selected</Text>
              <View style={styles.photoActionsRow}>
                <TouchableOpacity style={[styles.button, styles.secondaryBtn]} onPress={() => handlePick('camera')} disabled={disabled} testID="pick-camera">
                  <Camera color="#fff" size={18} />
                  <Text style={styles.buttonText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.secondaryBtn]} onPress={() => handlePick('library')} disabled={disabled} testID="pick-library">
                  <ImageIcon color="#fff" size={18} />
                  <Text style={styles.buttonText}>Library</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        {errors.photo ? <Text style={styles.errorText}>{errors.photo}</Text> : null}

        <View style={styles.form}>
          <FormInput
            label="name"
            value={form.name}
            onChangeText={(v) => onChange('name', v)}
            placeholder="name"
            error={errors.name}
            required
            maxLength={50}
            autoCapitalize="words"
            testID="input-name"
            autoCorrect={false}
            spellCheck={false}
          />
          <FormInput
            label="age"
            value={form.age}
            onChangeText={(v) => onChange('age', v)}
            placeholder="age"
            error={errors.age}
            required
            keyboardType="numeric"
            maxLength={2}
            testID="input-age"
            autoCorrect={false}
            spellCheck={false}
          />
          <FormInput
            label="city"
            value={form.city}
            onChangeText={(v) => onChange('city', v)}
            placeholder="city"
            error={errors.city}
            required
            autoCapitalize="words"
            testID="input-city"
            autoCorrect={false}
            spellCheck={false}
          />
          <FormInput
            label="description"
            value={form.description}
            onChangeText={(v) => onChange('description', v)}
            placeholder="short description"
            error={errors.description}
            multiline
            numberOfLines={4}
            maxLength={300}
            characterCount={form.description.length}
            testID="input-description"
            autoCorrect={true}
            spellCheck={true}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            testID="btn-submit-profile"
            style={[styles.button, styles.primaryBtn, disabled && styles.disabledBtn]}
            onPress={onSubmit}
            disabled={disabled}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <UploadCloud color="#fff" size={18} />
            )}
            <Text style={styles.buttonText}>{isSubmitting ? 'Uploading...' : 'Create Profile'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusRow}>
          {state.step === 'success' && (
            <>
              <CheckCircle2 color={'#22c55e'} size={20} />
              <Text style={styles.successText}>{state.message ?? 'Done'}</Text>
            </>
          )}
          {state.step === 'error' && (
            <>
              <AlertCircle color={'#ef4444'} size={20} />
              <Text style={styles.errorText}>{state.message ?? 'Something went wrong'}</Text>
            </>
          )}
        </View>
      </ScrollView>
    </ErrorBoundaryContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: Colors.light.background },
  title: { fontSize: 22, fontWeight: '700', color: Colors.light.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: Colors.light.tabIconDefault, marginBottom: 16 },
  photoBox: { width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#0f172a10', borderWidth: 1, borderColor: '#e2e8f0' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeholderText: { fontSize: 12, color: Colors.light.tabIconDefault },
  photoActionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  form: { marginTop: 16, gap: 10 },
  inputRow: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, backgroundColor: '#ffffff' },
  label: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  input: { fontSize: 16, color: Colors.light.text, minHeight: 24 },
  multiline: { minHeight: 72 },
  actions: { marginTop: 16 },
  button: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 14 },
  primaryBtn: { backgroundColor: Colors.light.tint },
  secondaryBtn: { backgroundColor: '#0f172a' },
  disabledBtn: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700' },
  statusRow: { minHeight: 28, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  successText: { color: '#22c55e' },
  errorText: { color: '#ef4444' },
  errorBoundary: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  errorBoundaryTitle: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  errorBoundaryMsg: { fontSize: 13, color: Colors.light.tabIconDefault, textAlign: 'center' },
  warningBox: { 
    backgroundColor: '#fef3c7', 
    borderColor: '#f59e0b', 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 16 
  },
  warningText: { 
    flex: 1, 
    fontSize: 13, 
    color: '#92400e', 
    lineHeight: 18 
  },
});
