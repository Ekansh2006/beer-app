import React, { useCallback, useMemo, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  Alert, 
  ActivityIndicator, 
  ScrollView,
  Pressable // Import Pressable
} from 'react-native';
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

// --- Interfaces remain the same ---
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

// --- ErrorBoundaryContainer remains the same ---
function ErrorBoundaryContainer({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  // ... (rest of ErrorBoundaryContainer is unchanged)
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
    <View onLayout={() => { try {} catch (e: any) { setError(e?.message ?? 'Unknown error'); } }} style={{ flex: 1 }}>
      {children}
    </View>
  );
}


export default function AddProfileScreen() {
  const { user } = useUser();
  const [form, setForm] = useState<FormState>({ name: '', age: '', city: '', description: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // NEW: State to hold the final image URL from Cloudinary
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  
  const [state, setState] = useState<UploadState>({ step: 'idle' });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // NEW: Ref for the hidden web file input
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Validation logic is now simplified ---
  const validate = useCallback((): boolean => {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.age.trim()) next.age = 'Age is required';
    else if (isNaN(Number(form.age.trim())) || Number(form.age.trim()) < 18) next.age = 'Must be a valid age (18+)';
    if (!form.city.trim()) next.city = 'City is required';
    
    // UPDATED: Validate the final image URL, not base64
    if (!profileImageUrl) {
      next.photo = 'Profile photo is required';
    }
    
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, profileImageUrl]);

  const onChange = useCallback((key: keyof FormState, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }, [errors]);

  // --- Permission logic remains the same ---
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

  // --- `handlePick` is for NATIVE ONLY now ---
  const handlePick = useCallback(async (source: 'camera' | 'library') => {
    const ok = await requestPermissions();
    if (!ok) return;

    try {
      setState({ step: 'picking', message: 'Opening...' });
      const picker = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const result = await picker({ allowsEditing: true, aspect: [1, 1], quality: 0.85, mediaTypes: ImagePicker.MediaTypeOptions.Images });

      if (result.canceled) {
        setState({ step: 'idle' });
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setState({ step: 'error', message: 'No image selected' });
        return;
      }

      // Show local preview immediately
      setPhotoPreview(asset.uri);
      setState({ step: 'uploading', message: 'Uploading photo...' });

      // Upload and get the final URL
      const finalUrl = await uploadImageToCloudinary(asset.uri);
      setProfileImageUrl(finalUrl);
      setErrors((e) => ({ ...e, photo: undefined }));
      setState({ step: 'idle' });
      
    } catch (e: any) {
      setState({ step: 'error', message: e?.message ?? 'Image picker failed' });
    }
  }, [requestPermissions]);
  
  // --- `onSubmit` now uses the final URL ---
  const onSubmit = useCallback(async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please login to continue');
      return;
    }
    if (user.status !== 'approved_username_assigned') {
      Alert.alert('Verification Required', 'Only verified users can create profiles.');
      return;
    }
    if (!validate()) return;
    
    setIsSubmitting(true);
    setState({ step: 'uploading', message: 'Creating profile...' });

    try {
      await addDoc(collection(db, 'profiles'), {
        name: form.name.trim(),
        age: Number(form.age.trim()),
        city: form.city.trim(),
        description: form.description.trim() || '',
        profileImageUrl: profileImageUrl, // Use the final URL
        uploaderUserId: user.id,
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
  }, [user, validate, form, profileImageUrl]);

  const disabled = useMemo(() => state.step === 'picking' || isSubmitting, [state.step, isSubmitting]);

  // --- RENDER SECTION ---
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

        {/* --- UNIFIED PHOTO UPLOAD UI --- */}
        <View style={styles.photoBox} testID="photo-box">
          {photoPreview ? (
            <Image source={{ uri: photoPreview }} style={styles.photo} contentFit="cover" />
          ) : (
            <Pressable
              style={styles.photoPlaceholder}
              onPress={() => {
                if (Platform.OS === 'web') {
                  fileInputRef.current?.click();
                } else {
                  handlePick('library');
                }
              }}
              disabled={disabled}
            >
              <ImageIcon size={48} color={Colors.light.tabIconDefault} />
              <Text style={styles.placeholderText}>Tap to add photo</Text>
              
              {/* Optional: You can keep these buttons for native if you like */}
              {Platform.OS !== 'web' && (
                <View style={styles.photoActionsRow}>
                  <TouchableOpacity style={[styles.button, styles.secondaryBtn]} onPress={() => handlePick('camera')} disabled={disabled}>
                    <Camera color="#fff" size={18} />
                    <Text style={styles.buttonText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.secondaryBtn]} onPress={() => handlePick('library')} disabled={disabled}>
                    <ImageIcon color="#fff" size={18} />
                    <Text style={styles.buttonText}>Library</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Pressable>
          )}
        </View>

        {/* --- HIDDEN WEB FILE INPUT --- */}
        {Platform.OS === 'web' && (
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              setPhotoPreview(URL.createObjectURL(file));
              setState({ step: 'uploading', message: 'Uploading photo...' });

              try {
                const finalUrl = await uploadImageToCloudinary(file);
                setProfileImageUrl(finalUrl);
                setErrors((prev) => ({ ...prev, photo: undefined }));
                setState({ step: 'idle' });
              } catch (err: any) {
                setState({ step: 'error', message: err?.message || 'Upload failed' });
                setPhotoPreview(null); // Clear preview on error
              }
            }}
          />
        )}
        
        {errors.photo ? <Text style={styles.errorText}>{errors.photo}</Text> : null}

        {/* --- Form Inputs remain the same --- */}
        <View style={styles.form}>
            <FormInput label="name" value={form.name} onChangeText={(v) => onChange('name', v)} placeholder="name" error={errors.name} required />
            <FormInput label="age" value={form.age} onChangeText={(v) => onChange('age', v)} placeholder="age" error={errors.age} required keyboardType="numeric" />
            <FormInput label="city" value={form.city} onChangeText={(v) => onChange('city', v)} placeholder="city" error={errors.city} required />
            <FormInput label="description" value={form.description} onChangeText={(v) => onChange('description', v)} placeholder="short description" error={errors.description} multiline />
        </View>

        {/* --- Submit button remains the same --- */}
        <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.primaryBtn, disabled && styles.disabledBtn]} onPress={onSubmit} disabled={disabled}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <UploadCloud color="#fff" size={18} />}
                <Text style={styles.buttonText}>{isSubmitting ? 'Uploading...' : 'Create Profile'}</Text>
            </TouchableOpacity>
        </View>

        {/* --- Status row remains the same --- */}
        <View style={styles.statusRow}>
            {/* ... */}
        </View>
      </ScrollView>
    </ErrorBoundaryContainer>
  );
}

// --- Styles remain the same ---
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
    button: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 14 },
    primaryBtn: { backgroundColor: Colors.light.tint },
    secondaryBtn: { backgroundColor: '#0f172a' },
    disabledBtn: { opacity: 0.6 },
    buttonText: { color: '#fff', fontWeight: '700' },
    statusRow: { minHeight: 28, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    successText: { color: '#22c55e' },
    errorText: { color: '#ef4444', marginTop: 8, textAlign: 'center' },
    warningBox: { backgroundColor: '#fef3c7', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    warningText: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 18 },
    errorBoundary: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    errorBoundaryTitle: { fontSize: 18, fontWeight: '700' },
    errorBoundaryMsg: { fontSize: 13, color: Colors.light.tabIconDefault, textAlign: 'center' }
});

