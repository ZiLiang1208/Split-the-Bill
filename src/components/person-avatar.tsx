import { Ionicons } from '@expo/vector-icons';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Person } from '@/lib/bill-context';

type Props = {
  person: Person;
  color: string;
  assignedCount: number;
  selected?: boolean;
  onPress?: () => void;
  onRemove: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((w) => w[0]?.toUpperCase() ?? '').join('');
  return letters || '?';
}

export const PersonAvatar = forwardRef<View, Props>(function PersonAvatar(
  { person, color, assignedCount, selected, onPress, onRemove, onLayout },
  ref
) {
  const theme = useTheme();

  return (
    <View ref={ref} onLayout={onLayout} style={styles.container} collapsable={false}>
      <View style={styles.circleWrap}>
        <Pressable
          onPress={onPress}
          style={[
            styles.circle,
            { backgroundColor: color },
            Shadow.sm,
            selected && [styles.circleSelected, { borderColor: theme.primary }],
          ]}
        >
          <ThemedText style={styles.initials} type="smallBold">
            {initials(person.name)}
          </ThemedText>
        </Pressable>

        {assignedCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.success, borderColor: theme.background }]}>
            <ThemedText type="small" style={styles.badgeText}>
              {assignedCount}
            </ThemedText>
          </View>
        )}

        <Pressable
          onPress={onRemove}
          hitSlop={6}
          style={[styles.removeBadge, { backgroundColor: theme.surface, borderColor: theme.background }]}
        >
          <Ionicons name="close" size={10} color={theme.textSecondary} />
        </Pressable>
      </View>
      <ThemedText type="small" numberOfLines={1} style={styles.name}>
        {person.name}
      </ThemedText>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: 60 },
  circleWrap: { width: 48, height: 48 },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSelected: {
    borderWidth: 3,
  },
  initials: { color: '#FFFFFF' },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, lineHeight: 12 },
  removeBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginTop: 6, maxWidth: 60, textAlign: 'center' },
});
