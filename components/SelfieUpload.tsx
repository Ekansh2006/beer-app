import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useUser } from '@/contexts/UserContext';
import Colors from '@/constants/colors';
import { Camera, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface UploadState {
  step: 'idle' | 'picking' | 'validating' | 'uploading' | 'success' | 'error';
  message?: string;
}

const MAX_SIZE_BYTES = 1_000_000;

export default function SelfieUpload() {
  const { user } = useUser();
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>({ step: 'idle' });



  const pickImage = useCallback(async () => {
    try {
      setState({ step: 'picking', message: 'Opening camera...' });

      const result = await (await import('expo-image-picker')).launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) {
        setState({ step: 'idle' });
        return;
      }

      const asset = result.assets?.[0];
      if (!asset) {
        setState({ step: 'error', message: 'No image captured' });
        return;
      }

      setPreviewUri(asset.uri ?? null);

      const base64 = asset.base64 ?? null;
      if (!base64) {
        setState({ step: 'error', message: 'Failed to read image data' });
        return;
      }

      setState({ step: 'validating', message: 'Validating image...' });

      const approxBytes = Math.ceil((base64.length * 3) / 4);
      if (approxBytes > MAX_SIZE_BYTES) {
        setState({ step: 'error', message: 'Image too large. Please retake with lower quality.' });
        return;
      }

      setImageBase64(base64);
      setState({ step: 'idle' });
    } catch (e: any) {
      setState({ step: 'error', message: e?.message ?? 'Camera failed' });
    }
  }, []);

  const onUpload = useCallback(async () => {
    if (!user?.id) { setState({ step: 'error', message: 'You must be logged in' }); return; }
    if (!imageBase64) { setState({ step: 'error', message: 'Please take a selfie first' }); return; }
    try {
      setState({ step: 'uploading', message: 'Uploading selfie...' });
      const dataUrl = `data:image/jpeg;base64,${imageBase64}`;
      const url = await uploadImageToCloudinary(dataUrl);
      await setDoc(doc(db, 'users', user.id), { selfieUrl: url }, { merge: true });
      setState({ step: 'success', message: 'Selfie uploaded successfully' });
    } catch (e: any) {
      setState({ step: 'error', message: e?.message ?? 'Upload failed' });
    }
  }, [user?.id, imageBase64]);

  const buttonDisabled = useMemo(() => state.step === 'picking' || state.step === 'uploading', [state.step]);

  return (
    <View style={styles.container} testID="selfie-upload">
      <Text style={styles.title}>Verify your identity</Text>
      <Text style={styles.subtitle}>Take a clear selfie with good lighting. Face only, no sunglasses.
      </Text>

      <View style={styles.previewBox} testID="selfie-preview">
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <View style={styles.previewPlaceholder}>
            <Camera size={48} color={Colors.light.tabIconDefault} />
            <Text style={styles.placeholderText}>No selfie yet</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          testID="btn-take-selfie"
          style={[styles.button, styles.secondaryBtn, buttonDisabled && styles.disabledBtn]}
          onPress={pickImage}
          disabled={buttonDisabled}
        >
          <Camera color="#fff" size={20} />
          <Text style={styles.buttonText}>Take Selfie</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="btn-upload-selfie"
          style={[styles.button, styles.primaryBtn, (!imageBase64 || buttonDisabled) && styles.disabledBtn]}
          onPress={onUpload}
          disabled={!imageBase64 || buttonDisabled}
        >
          <UploadCloud color="#fff" size={20} />
          <Text style={styles.buttonText}>Upload</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        {state.step === 'uploading' && (
          <>
            <ActivityIndicator color={Colors.light.tint} />
            <Text style={styles.statusText}>{state.message ?? 'Uploading...'}</Text>
          </>
        )}
        {state.step === 'success' && (
          <>
            <CheckCircle2 color={'#22c55e'} size={20} />
            <Text style={styles.successText}>{state.message ?? 'Success'}</Text>
          </>
        )}
        {state.step === 'error' && (
          <>
            <AlertCircle color={'#ef4444'} size={20} />
            <Text style={styles.errorText}>{state.message ?? 'Something went wrong'}</Text>
          </>
        )}
      </View>

      <Text style={styles.hint}>
        Requirements: square, max 800x800, under 1MB. We automatically optimize during upload.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginBottom: 16,
    lineHeight: 20,
  },
  previewBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0f172a10',
    borderColor: '#e2e8f0',
    borderWidth: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: Colors.light.tint,
  },
  secondaryBtn: {
    backgroundColor: '#0f172a',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
  },
  statusRow: {
    minHeight: 28,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    marginLeft: 8,
    color: Colors.light.text,
  },
  successText: {
    marginLeft: 8,
    color: '#22c55e',
  },
  errorText: {
    marginLeft: 8,
    color: '#ef4444',
  },
  hint: {
    marginTop: 12,
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
});
