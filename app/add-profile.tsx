import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator, ScrollView, Pressable, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useUser } from '@/contexts/UserContext';
import Colors from '@/constants/colors';
import { Camera, ImageIcon, UploadCloud, CheckCircle2, AlertCircle, ChevronLeft, X } from 'lucide-react-native';
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>({ step: 'idle' });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [showImagePicker, setShowImagePicker] = useState<boolean>(false);

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
    if (!photoUrl) {
      next.photo = 'Profile photo is required';
    }
    
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, photoUrl]);

  const onChange = useCallback((key: keyof FormState, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }, [errors]);

  const requestPermissions = useCallback(async (type: 'camera' | 'library') => {
    if (Platform.OS !== 'web') {
      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Required',
            'Please allow camera access to take photos.',
            [{ text: 'OK' }]
          );
          return false;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Photo Library Permission Required',
            'Please allow photo library access to select images.',
            [{ text: 'OK' }]
          );
          return false;
        }
      }
    }
    return true;
  }, []);

  const handlePick = useCallback(async (source: 'camera' | 'library') => {
    setShowImagePicker(false);
    const ok = await requestPermissions(source);
    if (!ok) return;
    try {
      setState({ step: 'picking', message: 'Opening...' });
      const picker = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await picker({ 
        allowsEditing: true, 
        aspect: [1, 1], 
        quality: 0.85, 
        mediaTypes: ImagePicker.MediaTypeOptions.Images 
      });
      if (result.canceled) { 
        setState({ step: 'idle' }); 
        return; 
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) { 
        setState({ step: 'error', message: 'No image selected' }); 
        return; 
      }
      setPhotoPreview(asset.uri);
      setErrors((e) => ({ ...e, photo: undefined }));
      setState({ step: 'uploading', message: 'Uploading photo...' });
      try {
        const url = await uploadImageToCloudinary(asset.uri);
        setPhotoUrl(url);
        setState({ step: 'idle', message: 'Photo uploaded' });
      } catch (err: any) {
        setState({ step: 'error', message: err?.message ?? 'Image upload failed' });
      }
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
    
    // Double-check photo URL
    if (!photoUrl) { 
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
      profileImageUrl: photoUrl,
    };
    
    (async () => {
      try {
        setIsSubmitting(true);
        setState({ step: 'uploading', message: 'Creating profile...' });
        await addDoc(collection(db, 'profiles'), {
          name: sanitizedData.name,
          age: sanitizedData.age,
          city: sanitizedData.city,
          description: sanitizedData.description,
          profileImageUrl: sanitizedData.profileImageUrl,
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
  }, [user, validate, photoUrl, form]);

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

        <Pressable
          style={styles.photoBox}
          testID="photo-box"
          onPress={() => {
            if (Platform.OS === 'web') {
              fileRef.current?.click();
            } else {
              setShowImagePicker(true);
            }
          }}
        >
          {photoPreview ? (
            <Image source={{ uri: photoPreview }} style={styles.photo} contentFit="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <ImageIcon size={48} color={Colors.light.tabIconDefault} />
              <Text style={styles.placeholderText}>Tap to add a photo</Text>
              <View style={styles.photoActionsRow}>
                <Text style={styles.orText}>or</Text>
              </View>
            </View>
          )}
        </Pressable>
        {Platform.OS === 'web' ? (
          // eslint-disable-next-line react/no-unknown-property
          React.createElement('input', {
            ref: fileRef as unknown as React.RefObject<HTMLInputElement>,
            type: 'file',
            accept: 'image/*',
            style: { display: 'none' },
            onChange: async (e: any) => {
              try {
                const fileList: FileList | null = e?.target?.files ?? null;
                const f: File | undefined = fileList && fileList.length > 0 ? fileList[0] : undefined;
                if (!f) return;
                setPhotoPreview(URL.createObjectURL(f));
                setState({ step: 'uploading', message: 'Uploading photo...' });
                const url = await uploadImageToCloudinary(f);
                setPhotoUrl(url);
                setErrors((prev) => ({ ...prev, photo: undefined }));
                setState({ step: 'idle', message: 'Photo uploaded' });
              } catch (err: any) {
                setState({ step: 'error', message: err?.message ?? 'Failed to upload image' });
              } finally {
                if (e?.target) {
                  e.target.value = '';
                }
              }
            }
          } as any)
        ) : null}
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

      {/* Image Picker Modal for Mobile */}
      <Modal
        visible={showImagePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Photo</Text>
              <TouchableOpacity 
                onPress={() => setShowImagePicker(false)}
                style={styles.closeButton}
              >
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>Choose how you&apos;d like to add your photo</Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cameraButton]} 
                onPress={() => handlePick('camera')}
                disabled={disabled}
              >
                <Camera color="#fff" size={24} />
                <Text style={styles.modalButtonText}>Take Photo</Text>
                <Text style={styles.modalButtonSubtext}>Use camera to take a new photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.libraryButton]} 
                onPress={() => handlePick('library')}
                disabled={disabled}
              >
                <ImageIcon color="#fff" size={24} />
                <Text style={styles.modalButtonText}>Choose from Library</Text>
                <Text style={styles.modalButtonSubtext}>Select from your photo library</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  orText: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text
  },
  closeButton: {
    padding: 4
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginBottom: 24
  },
  modalActions: {
    gap: 12
  },
  modalButton: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8
  },
  cameraButton: {
    backgroundColor: Colors.light.tint
  },
  libraryButton: {
    backgroundColor: '#0f172a'
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  modalButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    textAlign: 'center'
  }
});
