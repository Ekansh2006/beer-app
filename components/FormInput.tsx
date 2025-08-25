import React from 'react';
import { StyleSheet, Text, TextInput, View, TextInputProps, Platform } from 'react-native';
import Colors from '@/constants/colors';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
  characterCount?: number;
  maxLength?: number;
}

export default function FormInput({
  label,
  error,
  required = false,
  characterCount,
  maxLength,
  style,
  ...props
}: FormInputProps) {
  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        {maxLength && characterCount !== undefined && (
          <Text style={[
            styles.characterCount,
            characterCount > maxLength && styles.characterCountError
          ]}>
            {characterCount}/{maxLength}
          </Text>
        )}
      </View>
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style
        ]}
        placeholderTextColor={Colors.light.text}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    color: Colors.light.text,
  },
  required: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  characterCount: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  characterCountError: {
    color: Colors.light.text,
  },
  input: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.light.background,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    minHeight: 44,
  },
  inputError: {
    borderColor: '#000000',
    backgroundColor: Colors.light.background,
  },
  errorText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '900' as const,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
    marginTop: 4,
  },
});