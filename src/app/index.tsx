import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBill } from '@/lib/bill-context';

export default function CaptureScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { imageUri, setImageUri } = useBill();
  const [busy, setBusy] = useState(false);

  async function pickFromCamera() {
    if (Platform.OS !== 'web') {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();
      if (!granted) {
        Alert.alert('Camera permission needed', 'Enable camera access in Settings to scan a receipt.');
        return;
      }
    }
    setBusy(true);
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } finally {
      setBusy(false);
    }
  }

  async function pickFromLibrary() {
    if (Platform.OS !== 'web') {
      const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!granted) {
        Alert.alert('Photo library permission needed', 'Enable photo access in Settings to choose a receipt.');
        return;
      }
    }
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title="Split the Bill"
          subtitle="Scan a receipt, then split it item by item."
          step={1}
        />

        {imageUri ? (
          <ThemedView style={[styles.previewCard, Shadow.md]}>
            <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
            <Pressable
              onPress={() => setImageUri(null)}
              style={[styles.retakeBadge, { backgroundColor: theme.surface }, Shadow.sm]}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={theme.text} />
              <ThemedText type="smallBold">Retake</ThemedText>
            </Pressable>
          </ThemedView>
        ) : (
          <ThemedView
            style={[styles.placeholder, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <ThemedView type="primaryMuted" style={styles.placeholderIcon}>
              <Ionicons name="receipt-outline" size={32} color={theme.primary} />
            </ThemedView>
            <ThemedText type="smallBold" style={styles.placeholderTitle}>
              No receipt yet
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small" style={styles.placeholderHint}>
              Take a photo or upload one from your library
            </ThemedText>
          </ThemedView>
        )}

        <ThemedView style={styles.actions}>
          {Platform.OS !== 'web' && (
            <Pressable
              disabled={busy}
              onPress={pickFromCamera}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="camera-outline" size={20} color={theme.text} />
              <ThemedText type="smallBold">Take Photo</ThemedText>
            </Pressable>
          )}
          <Pressable
            disabled={busy}
            onPress={pickFromLibrary}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="image-outline" size={20} color={theme.text} />
            <ThemedText type="smallBold">{Platform.OS === 'web' ? 'Upload Photo' : 'Library'}</ThemedText>
          </Pressable>
        </ThemedView>

        <PrimaryButton
          label="Continue"
          icon="arrow-forward"
          disabled={!imageUri}
          onPress={() => router.push('/review')}
          style={styles.continueWrap}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  previewCard: {
    flex: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    minHeight: 200,
  },
  preview: { flex: 1 },
  retakeBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  placeholder: {
    flex: 1,
    minHeight: 200,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  placeholderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  placeholderTitle: {},
  placeholderHint: { textAlign: 'center', maxWidth: 220 },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  continueWrap: { marginBottom: Spacing.three },
  pressed: { opacity: 0.75 },
});
