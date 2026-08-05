import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

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
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((w) => w[0]?.toUpperCase() ?? '').join('');
  return letters || '?';
}

export function PersonAvatar({ person, color, assignedCount, selected, onPress, onRemove }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
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
          hitSlop={8}
          style={[styles.removeBadge, { backgroundColor: theme.surface, borderColor: theme.background }]}
        >
          <Ionicons name="close" size={9} color={theme.textSecondary} />
        </Pressable>
      </View>
      <ThemedText type="small" numberOfLines={1} style={[styles.name, { color: theme.textSecondary }]}>
        {person.name}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: 44 },
  circleWrap: { width: 34, height: 34 },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSelected: {
    borderWidth: 2,
  },
  initials: { color: '#FFFFFF', fontSize: 12, lineHeight: 14 },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { color: '#fff', fontSize: 9, lineHeight: 11 },
  removeBadge: {
    position: 'absolute',
    top: -3,
    left: -3,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { marginTop: 4, maxWidth: 44, fontSize: 11, textAlign: 'center' },
});
