import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Camera, ImageIcon, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react-native';
import Colors from '@/constants/colors';

// Detect if we're on a mobile device
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

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
      try {
        // Remove existing input if it exists
        if (cameraInputRef.current) {
          if (document.body.contains(cameraInputRef.current)) {
            document.body.removeChild(cameraInputRef.current);
          }
          cameraInputRef.current = null;
        }
        
        // Create a fresh file input for camera access
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        // Use different capture attributes based on device type
        if (isMobileDevice()) {
          input.setAttribute('capture', 'environment');
        }
        
        input.style.display = 'none';
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        input.style.top = '-9999px';
        input.style.width = '1px';
        input.style.height = '1px';
        input.style.opacity = '0';
        
        const handleChange = (e: Event) => {
          handleFileSelect(e);
          // Clean up after use
          setTimeout(() => {
            if (input && document.body.contains(input)) {
              document.body.removeChild(input);
            }
          }, 1000);
        };
        
        input.addEventListener('change', handleChange);
        
        // Handle cancel/escape
        const handleCancel = () => {
          setState({ step: 'idle' });
          setTimeout(() => {
            if (input && document.body.contains(input)) {
              document.body.removeChild(input);
            }
          }, 1000);
        };
        
        input.addEventListener('cancel', handleCancel);
        
        // Add focus/blur handlers for better mobile support
        input.addEventListener('focus', () => {
          console.log('Camera input focused');
        });
        
        input.addEventListener('blur', () => {
          console.log('Camera input blurred');
          // If no file was selected after blur, consider it cancelled
          setTimeout(() => {
            if (!input.files || input.files.length === 0) {
              handleCancel();
            }
          }, 500);
        });
        
        document.body.appendChild(input);
        cameraInputRef.current = input;
        
        // For mobile devices, we need to trigger the click in a user gesture context
        // Use requestAnimationFrame to ensure the DOM is ready
        requestAnimationFrame(() => {
          if (cameraInputRef.current) {
            console.log('Triggering camera input click');
            cameraInputRef.current.focus();
            cameraInputRef.current.click();
          }
        });
        
      } catch (error) {
        console.error('Error opening camera:', error);
        setState({ step: 'error', message: 'Failed to open camera. Please try again.' });
      }
    }
  }, [disabled, handleFileSelect]);

  const openGallery = useCallback(() => {
    if (disabled) return;
    
    setState({ step: 'picking', message: 'Opening gallery...' });
    
    if (Platform.OS === 'web') {
      try {
        // Remove existing input if it exists
        if (fileInputRef.current) {
          if (document.body.contains(fileInputRef.current)) {
            document.body.removeChild(fileInputRef.current);
          }
          fileInputRef.current = null;
        }
        
        // Create a fresh file input for gallery access
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = false;
        
        // Don't use capture attribute for gallery access
        input.style.display = 'none';
        input.style.position = 'absolute';
        input.style.left = '-9999px';
        input.style.top = '-9999px';
        input.style.width = '1px';
        input.style.height = '1px';
        input.style.opacity = '0';
        
        const handleChange = (e: Event) => {
          handleFileSelect(e);
          // Clean up after use
          setTimeout(() => {
            if (input && document.body.contains(input)) {
              document.body.removeChild(input);
            }
          }, 1000);
        };
        
        input.addEventListener('change', handleChange);
        
        // Handle cancel/escape
        const handleCancel = () => {
          setState({ step: 'idle' });
          setTimeout(() => {
            if (input && document.body.contains(input)) {
              document.body.removeChild(input);
            }
          }, 1000);
        };
        
        input.addEventListener('cancel', handleCancel);
        
        // Add focus/blur handlers for better mobile support
        input.addEventListener('blur', () => {
          // If no file was selected after blur, consider it cancelled
          setTimeout(() => {
            if (!input.files || input.files.length === 0) {
              handleCancel();
            }
          }, 500);
        });
        
        document.body.appendChild(input);
        fileInputRef.current = input;
        
        // Use requestAnimationFrame to ensure the DOM is ready
        requestAnimationFrame(() => {
          if (fileInputRef.current) {
            console.log('Triggering gallery input click');
            fileInputRef.current.focus();
            fileInputRef.current.click();
          }
        });
        
      } catch (error) {
        console.error('Error opening gallery:', error);
        setState({ step: 'error', message: 'Failed to open gallery. Please try again.' });
      }
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
      try {
        if (fileInputRef.current && document.body.contains(fileInputRef.current)) {
          document.body.removeChild(fileInputRef.current);
        }
        if (cameraInputRef.current && document.body.contains(cameraInputRef.current)) {
          document.body.removeChild(cameraInputRef.current);
        }
      } catch (error) {
        console.warn('Error cleaning up file inputs:', error);
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
        <View style={styles.webHintContainer}>
          <Text style={styles.webHint}>
            📱 On mobile: Camera button opens camera, Gallery opens photos
          </Text>
          {typeof window !== 'undefined' && window.location.protocol !== 'https:' && (
            <Text style={styles.httpsWarning}>
              ⚠️ Camera access requires HTTPS in production
            </Text>
          )}
          {isMobileDevice() && (
            <Text style={styles.webHint}>
              📸 Mobile detected: Camera access optimized for your device
            </Text>
          )}
          <Text style={styles.webHint}>
            💡 If camera doesn&apos;t open, try refreshing the page or check browser permissions
          </Text>
        </View>
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
  webHintContainer: {
    marginTop: 12,
    gap: 4,
  },
  webHint: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    lineHeight: 16,
  },
  httpsWarning: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
    textAlign: 'center',
  },
});