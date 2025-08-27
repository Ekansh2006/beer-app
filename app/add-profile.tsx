import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable } from 'react-native';
// Note: We no longer import ImagePicker, Alert, or TouchableOpacity
import { Image } from 'expo-image';
import { useUser } from '@/contexts/UserContext';
import Colors from '@/constants/colors';
import { ImageIcon, UploadCloud, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import FormInput from '@/components/FormInput';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

// --- Interfaces and ErrorBoundary remain the same ---
interface FormState { name: string; age: string; city: string; description: string; }
interface FormErrors { name?: string; age?: string; city?: string; description?: string; photo?: string; }
interface UploadState { step: 'idle' | 'uploading' | 'success' | 'error'; message?: string; }

function ErrorBoundaryContainer({ children }: { children: React.ReactNode }) {
    // This component remains the same
    const [error, setError] = useState<string | null>(null);
    const reset = useCallback(() => setError(null), []);
    if (error) {
        return (
            <View style={styles.errorBoundary}>
                <AlertCircle color={'#ef4444'} size={24} />
                <Text style={styles.errorBoundaryTitle}>Something went wrong</Text>
                <Text style={styles.errorBoundaryMsg}>{error}</Text>
                <Pressable style={[styles.button, styles.primaryBtn]} onPress={reset}>
                    <Text style={styles.buttonText}>Try again</Text>
                </Pressable>
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
            setState({ step: 'success', message: 'Profile created successfully!' });
            // Using a simple alert for web
            alert('Success! Your profile has been submitted for review.');
            router.replace('/(tabs)');
        } catch (e: any) {
            setState({ step: 'error', message: e?.message ?? 'Failed to create profile.' });
        } finally {
            setIsSubmitting(false);
        }
    }, [user, validate, form, profileImageUrl]);

    const disabled = useMemo(() => state.step === 'uploading' || isSubmitting, [state.step, isSubmitting]);

    return (
        <ErrorBoundaryContainer>
            <Stack.Screen options={{ title: 'Add Profile', headerLeft: () => (
                <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 12 }}>
                    <ChevronLeft size={20} color={Colors.light.text} />
                </Pressable>
            ) }} />
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>Create Profile</Text>
                <Text style={styles.subtitle}>Share basic info and a clear photo.</Text>
                <div style={{ marginBottom: 20 }}>
  <label htmlFor="photo-upload">
    <button type="button" style={{ padding: '12px 24px', fontSize: 16 }}>Choose Image</button>
  </label>
  <input
    id="photo-upload"
    type="file"
    accept="image/*"
    style={{
      position: 'absolute',
      left: '-9999px',
      width: '1px',
      height: '1px',
      opacity: 0,
      pointerEvents: 'none'
    }}
    onChange={async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setPhotoPreview(URL.createObjectURL(file));
      // place your upload logic here (e.g. call uploadImageToCloudinary)
    }}
  />
  {photoPreview &&
    <img src={photoPreview} alt="preview" style={{ marginTop: 12, width: 150, borderRadius: 8 }} />
  }
</div>

                {errors.photo && <Text style={styles.errorText}>{errors.photo}</Text>}

                <View style={styles.form}>
                    <FormInput label="Name" value={form.name} onChangeText={(v) => onChange('name', v)} placeholder="Enter name" error={errors.name} required />
                    <FormInput label="Age" value={form.age} onChangeText={(v) => onChange('age', v)} placeholder="Enter age" error={errors.age} required keyboardType="numeric" maxLength={2} />
                    <FormInput label="City" value={form.city} onChangeText={(v) => onChange('city', v)} placeholder="Enter city" error={errors.city} required />
                    <FormInput label="Description" value={form.description} onChangeText={(v) => onChange('description', v)} placeholder="A short description" error={errors.description} multiline numberOfLines={4} maxLength={300} />
                </View>

                <View style={styles.actions}>
                    <Pressable style={[styles.button, styles.primaryBtn, disabled && styles.disabledBtn]} onPress={onSubmit} disabled={disabled}>
                        {isSubmitting ? <ActivityIndicator color="#fff" /> : <UploadCloud color="#fff" size={18} />}
                        <Text style={styles.buttonText}>{isSubmitting ? 'Submitting...' : 'Create Profile'}</Text>
                    </Pressable>
                </View>

                <View style={styles.statusRow}>
                    {state.step === 'success' && <Text style={styles.successText}>{state.message}</Text>}
                    {state.step === 'error' && <Text style={styles.errorText}>{state.message}</Text>}
                </View>
            </ScrollView>
        </ErrorBoundaryContainer>
    );
}

// --- Styles remain the same ---
const styles = StyleSheet.create({
    container: { padding: 16, backgroundColor: Colors.light.background, paddingBottom: 50 },
    title: { fontSize: 24, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
    subtitle: { fontSize: 14, color: Colors.light.tabIconDefault, marginBottom: 20 },
    photoBox: { width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    photo: { width: '100%', height: '100%' },
    photoPlaceholder: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', gap: 12 },
    placeholderText: { fontSize: 14, color: Colors.light.tabIconDefault },
    form: { marginTop: 24, gap: 16 },
    actions: { marginTop: 24 },
    button: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
    primaryBtn: { backgroundColor: Colors.light.tint },
    disabledBtn: { opacity: 0.5 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    statusRow: { minHeight: 30, marginTop: 16, alignItems: 'center', justifyContent: 'center' },
    successText: { color: '#22c55e', fontWeight: '500' },
    errorText: { color: '#ef4444', marginTop: 8, textAlign: 'center', fontWeight: '500' },
    webLabel: { display: 'flex', width: '100%', height: '100%', cursor: 'pointer', alignItems: 'center', justifyContent: 'center' },
    errorBoundary: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    errorBoundaryTitle: { fontSize: 18, fontWeight: '700' },
    errorBoundaryMsg: { fontSize: 13, color: Colors.light.tabIconDefault, textAlign: 'center' }
});

