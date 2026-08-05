import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadow, Spacing, avatarColorFor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Person, ReceiptItem } from '@/lib/bill-context';

type Props = {
  item: ReceiptItem;
  people: Person[];
  assignedIds: string[];
  selected: boolean;
  onPress: () => void;
};

export function ItemRow({ item, people, assignedIds, selected, onPress }: Props) {
  const theme = useTheme();
  const assignedPeople = people.filter((p) => assignedIds.includes(p.id));
  const unassigned = assignedPeople.length === 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        style={[
          styles.row,
          { borderColor: selected ? theme.primary : theme.border },
          selected && { backgroundColor: theme.primaryMuted },
          Shadow.sm,
        ]}
      >
        <View style={styles.info}>
          <ThemedText type="smallBold">{item.name}</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {item.quantity > 1 ? `${item.quantity} × ` : ''}${item.price.toFixed(2)}
          </ThemedText>
        </View>
        <View style={styles.avatars}>
          {unassigned ? (
            <View style={[styles.unassignedPill, { backgroundColor: theme.surfaceAlt }]}>
              <Ionicons name="person-add-outline" size={12} color={theme.textMuted} />
              <ThemedText themeColor="textMuted" type="small">
                Unassigned
              </ThemedText>
            </View>
          ) : (
            assignedPeople.map((p) => {
              const colorIndex = people.findIndex((person) => person.id === p.id);
              return (
                <View
                  key={p.id}
                  style={[
                    styles.miniAvatar,
                    { backgroundColor: avatarColorFor(colorIndex), borderColor: theme.surface },
                  ]}
                >
                  <ThemedText type="small" style={styles.miniAvatarText}>
                    {p.name.trim().charAt(0).toUpperCase()}
                  </ThemedText>
                </View>
              );
            })
          )}
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Radius.md,
    marginBottom: Spacing.two,
    borderWidth: 1.5,
  },
  pressed: { opacity: 0.75 },
  info: { flex: 1 },
  avatars: { flexDirection: 'row' },
  unassignedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    borderWidth: 2,
  },
  miniAvatarText: { color: '#fff', fontSize: 11 },
});
