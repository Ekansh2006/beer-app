import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface CommentInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => void;
  profileName: string;
}

const MAX_COMMENT_LENGTH = 200;

export default function CommentInputModal({
  visible,
  onClose,
  onSubmit,
  profileName,
}: CommentInputModalProps) {
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (comment.trim().length === 0) {
      Alert.alert('error', 'please enter a comment');
      return;
    }

    if (comment.length > MAX_COMMENT_LENGTH) {
      Alert.alert('error', `comment must be ${MAX_COMMENT_LENGTH} characters or less`);
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      onSubmit(comment.trim());
      setComment('');
      onClose();
    } catch {
      Alert.alert('error', 'failed to post comment. please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setComment('');
    onClose();
  };

  const remainingChars = MAX_COMMENT_LENGTH - comment.length;
  const isOverLimit = remainingChars < 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            testID="close-comment-modal"
          >
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.title}>comment on {profileName.toLowerCase()}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <TextInput
            style={[styles.textInput, isOverLimit && styles.textInputError]}
            placeholder="add a comment..."
            placeholderTextColor={Colors.light.text}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={MAX_COMMENT_LENGTH + 50} // Allow typing over limit to show error
            autoFocus
            testID="comment-input"
          />
          
          <View style={styles.footer}>
            <Text style={[styles.charCount, isOverLimit && styles.charCountError]}>
              {remainingChars} characters remaining
            </Text>
            
            <TouchableOpacity
              style={[
                styles.submitButton,
                (comment.trim().length === 0 || isOverLimit || isSubmitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={comment.trim().length === 0 || isOverLimit || isSubmitting}
              testID="submit-comment"
            >
              <Text style={[
                styles.submitButtonText,
                (comment.trim().length === 0 || isOverLimit || isSubmitting) && styles.submitButtonTextDisabled
              ]}>
                {isSubmitting ? 'posting...' : 'post'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingTop: Platform.OS === 'ios' ? 60 : 12,
  },
  closeButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    textAlignVertical: 'top',
    backgroundColor: Colors.light.background,
  },
  textInputError: {
    borderColor: '#000000',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  charCount: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  charCountError: {
    color: Colors.light.text,
  },
  submitButton: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.light.background,
    opacity: 0.5,
  },
  submitButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  submitButtonTextDisabled: {
    color: Colors.light.text,
  },
});