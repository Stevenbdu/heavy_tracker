import { useRef, useEffect } from 'react';
import { FlatList, TouchableOpacity, View, Text } from 'react-native';
import { RadialRing } from './RadialRing';

type StripWeek = {
  isoWeek: string;
  done: number;
  target: number;
  label: string;
};

type Props = {
  weeks: StripWeek[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

const ACCENT = '#00E87A';
const TEXT_MUTED = '#666';
const ITEM_WIDTH = 72;

export function WeekHistoryStrip({ weeks, selectedIndex, onSelect }: Props) {
  const ref = useRef<FlatList<StripWeek>>(null);

  useEffect(() => {
    if (weeks.length === 0) return;
    const timeout = setTimeout(() => {
      ref.current?.scrollToIndex({
        index: Math.min(selectedIndex, weeks.length - 1),
        animated: true,
        viewPosition: 0.5,
      });
    }, 150);
    return () => clearTimeout(timeout);
  }, [selectedIndex, weeks.length]);

  return (
    <FlatList
      ref={ref}
      horizontal
      data={weeks}
      keyExtractor={(_, i) => String(i)}
      showsHorizontalScrollIndicator={false}
      snapToAlignment="center"
      snapToInterval={ITEM_WIDTH}
      decelerationRate="fast"
      getItemLayout={(_, index) => ({ length: ITEM_WIDTH, offset: ITEM_WIDTH * index, index })}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      onScrollToIndexFailed={() => {
        ref.current?.scrollToEnd({ animated: true });
      }}
      renderItem={({ item, index }) => {
        const isSelected = index === selectedIndex;
        return (
          <TouchableOpacity
            onPress={() => onSelect(index)}
            activeOpacity={0.7}
            style={{ alignItems: 'center', width: ITEM_WIDTH, paddingVertical: 8 }}
          >
            <View style={isSelected ? {
              shadowColor: ACCENT, shadowRadius: 8, shadowOpacity: 0.7, shadowOffset: { width: 0, height: 0 }, elevation: 6,
            } : {}}>
              <RadialRing done={item.done} target={item.target} size={44} strokeWidth={4} showLabel={false} />
            </View>
            <Text style={{
              color: isSelected ? ACCENT : TEXT_MUTED,
              fontSize: 9,
              fontWeight: isSelected ? '700' : '600',
              marginTop: 4,
              textAlign: 'center',
            }}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}
