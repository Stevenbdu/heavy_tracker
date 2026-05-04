import { View, Text, TouchableOpacity } from 'react-native';

export type DayLevel = 0 | 0.5 | 1;

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const ACCENT = '#00E87A';
const SURFACE3 = '#242424';
const TEXT = '#f0f0f0';
const TEXT_MUTED = '#666';

type Props = {
  days: DayLevel[];
  todayIndex: number | null;
  sessionNames?: (string | null)[];
  sessionIds?: (number | null)[];
  onPressSession?: (id: number) => void;
};

export function DayList({ days, todayIndex, sessionNames = [], sessionIds = [], onPressSession }: Props) {
  return (
    <View style={{ flex: 1, gap: 5 }}>
      {DAYS.map((name, i) => {
        const level = days[i] ?? 0;
        const isToday = todayIndex === i;
        const sessionName = sessionNames[i] ?? null;
        return (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 6,
              backgroundColor: isToday ? ACCENT + '1a' : 'transparent',
            }}
          >
            <View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: level === 1 ? ACCENT : level === 0.5 ? ACCENT + '55' : SURFACE3,
            }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: level > 0 ? TEXT : TEXT_MUTED, fontSize: 13, fontWeight: '600' }}>
                {name}
              </Text>
              {sessionName && (() => {
                const sid = sessionIds[i];
                return sid && onPressSession ? (
                  <TouchableOpacity onPress={() => onPressSession(sid)} activeOpacity={0.7}>
                    <Text style={{ color: ACCENT, fontSize: 10, fontWeight: '600', textDecorationLine: 'underline' }} numberOfLines={1}>
                      {sessionName}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={{ color: TEXT_MUTED, fontSize: 10, fontWeight: '400' }} numberOfLines={1}>
                    {sessionName}
                  </Text>
                );
              })()}
            </View>
            {isToday && (
              <View style={{ backgroundColor: ACCENT + '33', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: ACCENT, fontSize: 9, fontWeight: '700' }}>AUJ.</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
