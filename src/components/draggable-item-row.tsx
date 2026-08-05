import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Shadow, Spacing, avatarColorFor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Person, ReceiptItem } from '@/lib/bill-context';
import type { PersonLayout } from '@/lib/geometry';

type Props = {
  item: ReceiptItem;
  people: Person[];
  assignedIds: string[];
  personLayouts: SharedValue<Record<string, PersonLayout>>;
  onDropOnPerson: (personId: string) => void;
  selected: boolean;
  onPress: () => void;
};

export function DraggableItemRow({
  item,
  people,
  assignedIds,
  personLayouts,
  onDropOnPerson,
  selected,
  onPress,
}: Props) {
  const theme = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const pan = Gesture.Pan()
    .activateAfterLongPress(150)
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      'worklet';
      const layouts = personLayouts.value;
      const x = event.absoluteX;
      const y = event.absoluteY;
      let matchedId: string | null = null;
      for (const id in layouts) {
        const box = layouts[id];
        if (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) {
          matchedId = id;
          break;
        }
      }
      if (matchedId) {
        runOnJS(onDropOnPerson)(matchedId);
      }
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      isDragging.value = false;
    });

  const tap = Gesture.Tap()
    .maxDuration(150)
    .onEnd(() => {
      runOnJS(onPress)();
    });

  const composed = Gesture.Race(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    zIndex: isDragging.value ? 10 : 0,
    shadowOpacity: isDragging.value ? 0.22 : 0,
    shadowRadius: 12,
  }));

  const assignedPeople = people.filter((p) => assignedIds.includes(p.id));
  const unassigned = assignedPeople.length === 0;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={animatedStyle}>
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
      </Animated.View>
    </GestureDetector>
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
