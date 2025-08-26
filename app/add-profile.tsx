import React, { useCallback, useMemo, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  Alert, 
  ActivityIndicator, 
  ScrollView
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

// --- Interfaces and ErrorBoundary remain unchanged ---
interface FormState { name: string; age: string; city: string; description: string; }
interface FormErrors { name?: string; age?: string; city?: string; description?: string; photo?: string; }
interface UploadState { step: 'idle' | 'picking' | 'validating' | 'uploading' | 'success' | 'error'; message?: string; }

function ErrorBoundaryContainer({ children }: { children: React.ReactNode }) { /* ... unchanged ... */ 
  const [error, setError] = useState<string | null>(null);
  const reset = useCallback(() => setError(null), []);
  if (error) {
    return (
      <View style={styles.errorBoundary}>
        <AlertCircle color={'#ef4444'} size={24} />
        <Text style={styles.errorBoundaryTitle}>Something went wrong</Text>
        <Text style={styles.errorBoundaryMsg}>{error}</Text>
        <TouchableOpacity style={[styles.button, styles.primaryBtn]} onPress={reset}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return <View style={{ flex: 1 }}>{children}</View>;
}


export default function AddProfileScreen() {
  const { user } = useUser();
  const [form, setForm] = useState<FormState>({ name: '', age: '', city: '', description: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>({ step: 'idle' });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const validate = useCallback((): boolean => {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.age.trim() || Number(form.age.trim()) < 18) next.age = 'Must be a valid age (18+)';
    if (!form.city.trim()) next.city = 'City is required';
    if (!profileImageUrl) next.photo = 'Profile photo is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form, profileImageUrl]);

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
      const result = await picker({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (result.canceled || !result.assets?.[0]?.uri) {
        setState({ step: 'idle' }); return;
      }
      setPhotoPreview(result.assets[0].uri);
      setState({ step: 'uploading', message: 'Uploading photo...' });
      const finalUrl = await uploadImageToCloudinary(result.assets[0].uri);
      setProfileImageUrl(finalUrl);
      setErrors((e) => ({ ...e, photo: undefined }));
      setState({ step: 'idle' });
    } catch (e: any) {
      setState({ step: 'error', message: e?.message ?? 'Image picker failed' });
    }
  }, [requestPermissions]);
  
  const onSubmit = useCallback(async () => {
    if (!user?.id || user.status !== 'approved_username_assigned' || !validate()) return;
    setIsSubmitting(true);
    setState({ step: 'uploading', message: 'Creating profile...' });
    try {
      await addDoc(collection(db, 'profiles'), {
        name: form.name.trim(),
        age: Number(form.age.trim()),
        city: form.city.trim(),
        description: form.description.trim() || '',
        profileImageUrl,
        uploaderUserId: user.id,
        uploaderUsername: user.username ?? '',
        greenFlags: 0, redFlags: 0, commentCount: 0,
        approvalStatus: 'pending',
        createdAt: serverTimestamp(),
      });
      setState({ step: 'success', message: 'Profile created' });
      Alert.alert('Success', 'Profile created successfully', [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]);
    } catch (e: any) {
      setState({ step: 'error', message: e?.message ?? 'Failed to create profile' });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, validate, form, profileImageUrl]);

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
        <Text style={styles.subtitle}>Share basic info and a clear photo.</Text>
        
        {/* --- Photo Upload Section --- */}
        <View style={styles.photoBox} testID="photo-box">
          {photoPreview ? (
            <Image source={{ uri: photoPreview }} style={styles.photo} contentFit="cover" />
          ) : (
            <>
              {/* NATIVE: TouchableOpacity for mobile */}
              {Platform.OS !== 'web' && (
                <TouchableOpacity style={styles.photoPlaceholder} onPress={() => handlePick('library')} disabled={disabled}>
                  <ImageIcon size={48} color={Colors.light.tabIconDefault} />
                  <Text style={styles.placeholderText}>Tap to add photo</Text>
                </TouchableOpacity>
              )}

              {/* WEB: Styled <label> to trigger the hidden file input */}
              {Platform.OS === 'web' && (
                <label htmlFor="photo-upload" style={styles.webLabel as any}>
                  <div style={styles.photoPlaceholder as any}>
                    <ImageIcon size={48} color={Colors.light.tabIconDefault} />
                    <Text style={styles.placeholderText}>Tap to add photo</Text>
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
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
                        setPhotoPreview(null);
                      }
                    }}
                  />
                </label>
              )}
            </>
          )}
        </View>
        {errors.photo ? <Text style={styles.errorText}>{errors.photo}</Text> : null}

        {/* --- Form Inputs --- */}
        <View style={styles.form}>
          {/* ... Your FormInput components are unchanged ... */}
          <FormInput label="name" value={form.name} onChangeText={(v) => onChange('name', v)} placeholder="Name" error={errors.name} required />
          <FormInput label="age" value={form.age} onChangeText={(v) => onChange('age', v)} placeholder="Age" error={errors.age} required keyboardType="numeric" maxLength={2} />
          <FormInput label="city" value={form.city} onChangeText={(v) => onChange('city', v)} placeholder="City" error={errors.city} required />
          <FormInput label="description" value={form.description} onChangeText={(v) => onChange('description', v)} placeholder="Short description" error={errors.description} multiline numberOfLines={4} maxLength={300} />
        </View>

        {/* --- Submit Button --- */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.primaryBtn, disabled && styles.disabledBtn]} onPress={onSubmit} disabled={disabled}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <UploadCloud color="#fff" size={18} />}
            <Text style={styles.buttonText}>{isSubmitting ? 'Uploading...' : 'Create Profile'}</Text>
          </TouchableOpacity>
        </View>

        {/* --- Status Messages --- */}
        <View style={styles.statusRow}>
          {/* ... Your success/error messages are unchanged ... */}
        </View>
      </ScrollView>
    </ErrorBoundaryContainer>
  );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
  // ... Your existing styles are unchanged
  container: { padding: 16, backgroundColor: Colors.light.background },
  title: { fontSize: 22, fontWeight: '700', color: Colors.light.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: Colors.light.tabIconDefault, marginBottom: 16 },
  photoBox: { width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#e2e8f0' },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  placeholderText: { fontSize: 14, color: Colors.light.tabIconDefault },
  form: { marginTop: 16, gap: 10 },
  button: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 14 },
  primaryBtn: { backgroundColor: Colors.light.tint },
  disabledBtn: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700' },
  statusRow: { minHeight: 28, marginTop: 12 },
  errorText: { color: '#ef4444', marginTop: 8, textAlign: 'center' },
  actions: { marginTop: 24 },

  // NEW STYLE FOR WEB LABEL
  webLabel: {
    display: 'flex',
    flex: 1,
    cursor: 'pointer',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Existing styles
  errorBoundary: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  errorBoundaryTitle: { fontSize: 18, fontWeight: '700' },
  errorBoundaryMsg: { fontSize: 13, color: Colors.light.tabIconDefault, textAlign: 'center' }
});
