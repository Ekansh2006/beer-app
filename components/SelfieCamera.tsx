import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { Camera, RotateCcw, Check, X } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface SelfieCapture {
  uri: string;
  width: number;
  height: number;
}

interface SelfieCameraProps {
  onCapture: (selfie: SelfieCapture) => void;
  onCancel: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const CAMERA_SIZE = screenWidth - 32;

export default function SelfieCamera({ onCapture, onCancel }: SelfieCameraProps) {
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhoto, setCapturedPhoto] = useState<SelfieCapture | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Camera size={64} color={Colors.light.text} />
          <Text style={styles.permissionTitle}>camera access required</Text>
          <Text style={styles.permissionMessage}>
            we need camera access for selfie verification
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>grant permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        skipProcessing: false,
      });

      if (photo) {
        setCapturedPhoto({
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
        });
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('error', 'failed to take photo. please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const retakePicture = () => {
    setCapturedPhoto(null);
  };

  const confirmPicture = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (capturedPhoto) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>review your selfie</Text>
          <View style={styles.previewImageContainer}>
            <Image
              source={{ uri: capturedPhoto.uri }}
              style={styles.previewImage}
              contentFit="cover"
            />
          </View>
          <Text style={styles.previewInstructions}>
            make sure your face is clearly visible and well-lit
          </Text>
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={retakePicture}
              activeOpacity={0.8}
            >
              <RotateCcw size={20} color={Colors.light.text} />
              <Text style={styles.retakeButtonText}>retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={confirmPicture}
              activeOpacity={0.8}
            >
              <Check size={20} color={Colors.light.text} />
              <Text style={styles.confirmButtonText}>use photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <Text style={styles.cameraTitle}>take verification selfie</Text>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructions}>• look directly at camera</Text>
          <Text style={styles.instructions}>• ensure good lighting</Text>
          <Text style={styles.instructions}>• no sunglasses or hats</Text>
          <Text style={styles.instructions}>• face should fill the frame</Text>
        </View>
        
        <View style={styles.cameraWrapper}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.faceGuide} />
            </View>
          </CameraView>
        </View>

        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.flipButton}
            onPress={toggleCameraFacing}
            activeOpacity={0.8}
          >
            <RotateCcw size={24} color={Colors.light.text} />
            <Text style={styles.flipButtonText}>flip</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.captureButton,
              isCapturing && styles.captureButtonDisabled
            ]}
            onPress={takePicture}
            disabled={isCapturing}
            activeOpacity={0.8}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <X size={24} color={Colors.light.text} />
            <Text style={styles.cancelButtonText}>cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 16,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
  },
  cameraContainer: {
    flex: 1,
    padding: 16,
  },
  cameraTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  instructionsContainer: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  instructions: {
    fontSize: 14,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    marginBottom: 4,
  },
  cameraWrapper: {
    alignSelf: 'center',
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: CAMERA_SIZE * 0.7,
    height: CAMERA_SIZE * 0.8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: (CAMERA_SIZE * 0.7) / 2,
    backgroundColor: 'transparent',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
  },
  flipButton: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  flipButtonText: {
    fontSize: 12,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.background,
    borderWidth: 4,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 32,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#000000',
  },
  cancelButton: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
  },
  previewContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  previewImageContainer: {
    alignSelf: 'center',
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewInstructions: {
    fontSize: 14,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 32,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
  },
});