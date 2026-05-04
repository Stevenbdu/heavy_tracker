import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = {
  done: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
};

const ACCENT = '#00E87A';
const SURFACE3 = '#242424';

export function RadialRing({ done, target, size = 130, strokeWidth = 12, showLabel = true }: Props) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(done / target, 1) : 0;
  const dash = circumference * pct;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={cx} cy={cy} r={r} stroke={SURFACE3} strokeWidth={strokeWidth} fill="none" />
        {pct > 0 && (
          <Circle
            cx={cx} cy={cy} r={r}
            stroke={ACCENT} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            rotation="-90"
            origin={`${cx}, ${cy}`}
          />
        )}
      </Svg>
      {showLabel && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#f0f0f0', fontSize: size > 80 ? 28 : 14, fontWeight: '800' }}>
            {done}
          </Text>
          {size > 80 && (
            <Text style={{ color: '#666', fontSize: 10, fontWeight: '600', marginTop: 2 }}>
              séances
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
