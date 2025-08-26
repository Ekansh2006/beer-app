import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Camera, ImageIcon, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface WebPhotoUploadProps {
  onImageSelected: (base64: string, uri: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  currentImage?: string | null;
}

interface UploadState {
  step: 'idle' | 'picking' | 'validating' | 'success' | 'error';
  message?: string;
}

const MAX_SIZE_BYTES = 5_000_000; // 5MB for web (larger than mobile)
const SUPPORTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function WebPhotoUpload({ 
  onImageSelected, 
  onError, 
  disabled = false, 
  currentImage = null 
}: WebPhotoUploadProps) {
  const [state, setState] = useState<UploadState>({ step: 'idle' });
  const [previewUri, setPreviewUri] = useState<string | null>(currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Update preview when currentImage changes
  useEffect(() => {
    setPreviewUri(currentImage);
  }, [currentImage]);

  const validateImage = useCallback((file: File): Promise<{ isValid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      // Check file size
      if (file.size > MAX_SIZE_BYTES) {
        resolve({ isValid: false, error: `Image too large. Maximum size is ${Math.round(MAX_SIZE_BYTES / 1024 / 1024)}MB.` });
        return;
      }

      // Check minimum size
      if (file.size < 1000) {
        resolve({ isValid: false, error: 'Image too small. Please upload a valid photo.' });
        return;
      }

      // Check file type
      if (!SUPPORTED_FORMATS.includes(file.type.toLowerCase())) {
        resolve({ isValid: false, error: 'Unsupported format. Please use JPEG, PNG, or WebP.' });
        return;
      }

      // Additional validation using Image object
      const img = new window.Image();
      img.onload = () => {
        // Check minimum dimensions
        if (img.width < 100 || img.height < 100) {
          resolve({ isValid: false, error: 'Image too small. Minimum size is 100x100 pixels.' });
          return;
        }

        // Check maximum dimensions
        if (img.width > 4000 || img.height > 4000) {
          resolve({ isValid: false, error: 'Image too large. Maximum size is 4000x4000 pixels.' });
          return;
        }

        resolve({ isValid: true });
      };

      img.onerror = () => {
        resolve({ isValid: false, error: 'Invalid image file. Please try another photo.' });
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  const processFile = useCallback(async (file: File) => {
    try {
      setState({ step: 'validating', message: 'Validating image...' });
      
      const validation = await validateImage(file);
      if (!validation.isValid) {
        setState({ step: 'error', message: validation.error });
        onError(validation.error || 'Invalid image');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          const base64 = result.split(',')[1]; // Remove data:image/...;base64, prefix
          const uri = URL.createObjectURL(file);
          
          setPreviewUri(uri);
          setState({ step: 'success', message: 'Image ready' });
          onImageSelected(base64, uri);
          
          // Clear success message after 2 seconds
          setTimeout(() => {
            setState({ step: 'idle' });
          }, 2000);
        }
      };
      
      reader.onerror = () => {
        const error = 'Failed to read image file';
        setState({ step: 'error', message: error });
        onError(error);
      };
      
      reader.readAsDataURL(file);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to process image';
      setState({ step: 'error', message: errorMessage });
      onError(errorMessage);
    }
  }, [validateImage, onImageSelected, onError]);

  const handleFileSelect = useCallback((event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      processFile(file);
    } else {
      setState({ step: 'idle' });
    }
    
    // Reset input value to allow selecting the same file again
    target.value = '';
  }, [processFile]);

  const openCamera = useCallback(() => {
    if (disabled) return;
    
    setState({ step: 'picking', message: 'Opening camera...' });
    
    if (Platform.OS === 'web') {
      // Create a hidden file input for camera access
      if (!cameraInputRef.current) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment'; // Use rear camera by default
        input.style.display = 'none';
        input.addEventListener('change', handleFileSelect);
        document.body.appendChild(input);
        cameraInputRef.current = input;
      }
      
      cameraInputRef.current.click();
    }
  }, [disabled, handleFileSelect]);

  const openGallery = useCallback(() => {
    if (disabled) return;
    
    setState({ step: 'picking', message: 'Opening gallery...' });
    
    if (Platform.OS === 'web') {
      // Create a hidden file input for gallery access
      if (!fileInputRef.current) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = false;
        input.style.display = 'none';
        input.addEventListener('change', handleFileSelect);
        document.body.appendChild(input);
        fileInputRef.current = input;
      }
      
      fileInputRef.current.click();
    }
  }, [disabled, handleFileSelect]);

  const clearImage = useCallback(() => {
    setPreviewUri(null);
    setState({ step: 'idle' });
    onImageSelected('', '');
  }, [onImageSelected]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (fileInputRef.current) {
        document.body.removeChild(fileInputRef.current);
      }
      if (cameraInputRef.current) {
        document.body.removeChild(cameraInputRef.current);
      }
    };
  }, []);

  const isProcessing = state.step === 'picking' || state.step === 'validating';
  const buttonDisabled = disabled || isProcessing;

  return (
    <View style={styles.container} testID="web-photo-upload">
      <View style={styles.previewBox} testID="photo-preview">
        {previewUri ? (
          <>
            <Image 
              source={{ uri: previewUri }} 
              style={styles.previewImage} 
              contentFit="cover" 
            />
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={clearImage}
              testID="clear-image"
            >
              <RotateCcw size={16} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.previewPlaceholder}>
            <ImageIcon size={48} color={Colors.light.tabIconDefault} />
            <Text style={styles.placeholderText}>No photo selected</Text>
            
            <View style={styles.uploadActions}>
              <TouchableOpacity
                testID="btn-camera"
                style={[styles.button, styles.cameraBtn, buttonDisabled && styles.disabledBtn]}
                onPress={openCamera}
                disabled={buttonDisabled}
              >
                <Camera color="#fff" size={18} />
                <Text style={styles.buttonText}>Camera</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                testID="btn-gallery"
                style={[styles.button, styles.galleryBtn, buttonDisabled && styles.disabledBtn]}
                onPress={openGallery}
                disabled={buttonDisabled}
              >
                <ImageIcon color="#fff" size={18} />
                <Text style={styles.buttonText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Status Messages */}
      <View style={styles.statusRow}>
        {isProcessing && (
          <>
            <ActivityIndicator color={Colors.light.tint} size="small" />
            <Text style={styles.statusText}>{state.message || 'Processing...'}</Text>
          </>
        )}
        {state.step === 'success' && (
          <>
            <CheckCircle2 color={'#22c55e'} size={20} />
            <Text style={styles.successText}>{state.message || 'Success'}</Text>
          </>
        )}
        {state.step === 'error' && (
          <>
            <AlertCircle color={'#ef4444'} size={20} />
            <Text style={styles.errorText}>{state.message || 'Something went wrong'}</Text>
          </>
        )}
      </View>

      {/* Web-specific instructions */}
      {Platform.OS === 'web' && (
        <Text style={styles.webHint}>
          📱 On mobile: Camera button opens camera, Gallery opens photos
          {Platform.OS === 'web' && window.location.protocol !== 'https:' && (
            <Text style={styles.httpsWarning}>
              ⚠️ Camera access requires HTTPS in production
            </Text>
          )}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  previewBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  clearButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
  },
  uploadActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    minWidth: 100,
  },
  cameraBtn: {
    backgroundColor: '#0f172a',
  },
  galleryBtn: {
    backgroundColor: Colors.light.tint,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statusRow: {
    minHeight: 28,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  statusText: {
    color: Colors.light.text,
    fontSize: 14,
  },
  successText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  webHint: {
    marginTop: 12,
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    lineHeight: 16,
  },
  httpsWarning: {
    color: '#f59e0b',
    fontWeight: '600',
  },
});