import { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';

import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  changePassword,
} from '../services/authService';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] =
    useState('');

  const [newPassword, setNewPassword] =
    useState('');

  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showCurrent, setShowCurrent] =
    useState(false);

  const [showNew, setShowNew] =
    useState(false);

  const [showConfirm, setShowConfirm] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================

  const handleChangePassword = async () => {
    if (loading) return;

    setError('');

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }

    if (!newPassword) {
      setError('Please enter your new password.');
      return;
    }

    if (
      newPassword.length < 8 ||
      newPassword.length > 72
    ) {
      setError(
        'New password must be between 8 and 72 characters.'
      );
      return;
    }

    if (!confirmPassword) {
      setError('Please confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setError(
        'Your new password must be different from your current password.'
      );
      return;
    }

    try {
      setLoading(true);

      await changePassword(
        currentPassword,
        newPassword,
        confirmPassword
      );

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert(
        'Success',
        'Your password has been changed successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to change your password.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // PASSWORD FIELD
  // =========================================================

  const passwordField = (
    label: string,
    value: string,
    onChange: (text: string) => void,
    visible: boolean,
    toggleVisible: () => void,
    autoComplete:
      | 'password'
      | 'new-password'
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
      </Text>

      <View style={styles.inputContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={19}
          color="#817B71"
        />

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => {
            onChange(text);
            setError('');
          }}
          placeholder={label}
          placeholderTextColor="#9A9186"
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={autoComplete}
          editable={!loading}
        />

        <Pressable
          style={styles.eyeButton}
          onPress={toggleVisible}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={
            visible
              ? `Hide ${label}`
              : `Show ${label}`
          }
        >
          <Ionicons
            name={
              visible
                ? 'eye-off-outline'
                : 'eye-outline'
            }
            size={21}
            color="#817B71"
          />
        </Pressable>
      </View>
    </View>
  );

  // =========================================================
  // UI
  // =========================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#171717"
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>
              Change Password
            </Text>

            <Text style={styles.subtitle}>
              Update your account security
            </Text>
          </View>
        </View>

        {/* CARD */}

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="shield-checkmark-outline"
              size={30}
              color="#E35B3F"
            />
          </View>

          <Text style={styles.cardTitle}>
            Set a New Password
          </Text>

          <Text style={styles.description}>
            Enter your current password,
            then choose a new one.
          </Text>

          {passwordField(
            'Current Password',
            currentPassword,
            setCurrentPassword,
            showCurrent,
            () => setShowCurrent((value) => !value),
            'password'
          )}

          {passwordField(
            'New Password',
            newPassword,
            setNewPassword,
            showNew,
            () => setShowNew((value) => !value),
            'new-password'
          )}

          {passwordField(
            'Confirm New Password',
            confirmPassword,
            setConfirmPassword,
            showConfirm,
            () => setShowConfirm((value) => !value),
            'new-password'
          )}

          {/* REQUIREMENTS */}

          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#817B71"
            />

            <Text style={styles.infoText}>
              Your new password must contain
              between 8 and 72 characters.
            </Text>
          </View>

          {/* ERROR */}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#C94C4C"
              />

              <Text style={styles.errorText}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* SAVE */}

          <Pressable
            style={[
              styles.saveButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#FFFFFF"
                />

                <Text style={styles.saveText}>
                  Change Password
                </Text>
              </>
            )}
          </Pressable>

          {/* CANCEL */}

          <Pressable
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3EC',
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 35,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7DED1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 25,
    fontWeight: '900',
    color: '#171717',
  },

  subtitle: {
    fontSize: 13,
    color: '#817B71',
    marginTop: 4,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E7DED1',
    padding: 20,
  },

  iconCircle: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: '#FFF0E9',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 15,
  },

  cardTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#171717',
    textAlign: 'center',
  },

  description: {
    fontSize: 13,
    color: '#817B71',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 25,
  },

  field: {
    marginBottom: 18,
  },

  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#171717',
    marginBottom: 9,
  },

  inputContainer: {
    height: 55,
    backgroundColor: '#F8F2EA',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E7DED1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
  },

  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#171717',
    paddingHorizontal: 11,
  },

  eyeButton: {
    width: 48,
    height: 53,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#817B71',
  },

  errorBox: {
    backgroundColor: '#FFF0EF',
    borderRadius: 12,
    padding: 12,
    marginTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  errorText: {
    flex: 1,
    color: '#C94C4C',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },

  saveButton: {
    minHeight: 55,
    backgroundColor: '#E35B3F',
    borderRadius: 16,
    marginTop: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  disabledButton: {
    opacity: 0.55,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  cancelButton: {
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 8,
  },

  cancelText: {
    color: '#817B71',
    fontSize: 14,
    fontWeight: '800',
  },
});