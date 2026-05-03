import { useState } from 'react';
import { View, Text, LayoutChangeEvent, Switch } from 'react-native';
import Svg, {
  Path,
  Circle,
  G,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors } from '@/lib/theme';

export type ChartPoint = { label: string; value: number };
export type MLDataset = { id: string; name: string; color: string; points: ChartPoint[] };

// ── Single line chart ─────────────────────────────────────────────
export function LineChart({
  data,
  color,
  unit = '',
  height = 130,
  gradientId,
  showRecord = false,
}: {
  data: ChartPoint[];
  color: string;
  unit?: string;
  height?: number;
  gradientId: string;
  showRecord?: boolean;
}) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  if (data.length < 2) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center' }} onLayout={onLayout}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {data.length === 1 ? "Besoin d'au moins 2 points" : 'Aucune donnée'}
        </Text>
      </View>
    );
  }

  const PAD = { top: 22, bottom: 22, left: 6, right: 6 };
  const cW = w - PAD.left - PAD.right;
  const cH = height - PAD.top - PAD.bottom;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const toX = (i: number) => PAD.left + (cW / (data.length - 1)) * i;
  const toY = (v: number) => PAD.top + cH - ((v - min) / range) * cH;

  const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value), v: d.value, label: d.label }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fillPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + cH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`;

  const recordIdx = showRecord ? values.indexOf(max) : -1;
  const lastIdx = data.length - 1;

  return (
    <View onLayout={onLayout}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <SvgGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.28" />
              <Stop offset="1" stopColor={color} stopOpacity="0.01" />
            </SvgGradient>
          </Defs>
          <Path d={fillPath} fill={`url(#${gradientId})`} />
          <Path d={linePath} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => {
            const isLast = i === lastIdx;
            const isRecord = showRecord && i === recordIdx && recordIdx !== lastIdx;
            const showValueLabel = isLast || isRecord || i === 0;
            const dotR = isLast ? 5 : isRecord ? 4 : 2.5;
            const dotFill = isLast || isRecord ? color : colors.surface1;
            return (
              <G key={i}>
                <Circle
                  cx={p.x} cy={p.y} r={dotR}
                  fill={dotFill} stroke={color}
                  strokeWidth={isLast || isRecord ? 0 : 1.5}
                />
                {showValueLabel && (
                  <SvgText
                    x={Math.min(Math.max(p.x, 20), w - 20)}
                    y={p.y - 8}
                    textAnchor="middle"
                    fill={isRecord ? '#f59e0b' : color}
                    fontSize={9}
                    fontWeight="700"
                  >
                    {p.v}{unit}
                  </SvgText>
                )}
                <SvgText
                  x={p.x}
                  y={height - 6}
                  textAnchor="middle"
                  fill={colors.textMuted}
                  fontSize={8}
                  fontWeight="600"
                >
                  {p.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

// ── Multi-line chart ──────────────────────────────────────────────
export function MultiLineChart({
  datasets,
  activeIds,
  height = 200,
}: {
  datasets: MLDataset[];
  activeIds: string[];
  height?: number;
}) {
  const [w, setW] = useState(0);

  const active = datasets.filter((d) => activeIds.includes(d.id) && d.points.some((p) => p.value > 0));
  const allVals = active.flatMap((d) => d.points.map((p) => p.value));
  const maxVal = Math.max(...allVals, 1);
  const xLabels = datasets[0]?.points.map((p) => p.label) ?? [];
  const numPts = xLabels.length;
  const PAD = { top: 16, bottom: 24, left: 42, right: 8 };

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (() => {
        const cW = w - PAD.left - PAD.right;
        const cH = height - PAD.top - PAD.bottom;
        const toX = (i: number) => PAD.left + (cW / Math.max(numPts - 1, 1)) * i;
        const toY = (v: number) => PAD.top + cH - (v / maxVal) * cH;
        const yTicks = [0, 0.33, 0.67, 1].map((t) => Math.round((t * maxVal) / 100) * 100);
        const bottomY = toY(0);

        return (
          <Svg width={w} height={height}>
            <Defs>
              {active.map((d) => (
                <SvgGradient key={d.id} id={`mlg_${d.id}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={d.color} stopOpacity="0.2" />
                  <Stop offset="1" stopColor={d.color} stopOpacity="0" />
                </SvgGradient>
              ))}
            </Defs>
            {yTicks.map((v, ti) => {
              const y = toY(v);
              return (
                <G key={ti}>
                  <Path
                    d={`M${PAD.left},${y.toFixed(1)} L${(w - PAD.right).toFixed(1)},${y.toFixed(1)}`}
                    stroke={colors.divider}
                    strokeWidth={0.5}
                    strokeDasharray={ti > 0 ? '3,3' : undefined}
                  />
                  <SvgText x={PAD.left - 4} y={y + 4} textAnchor="end" fill={colors.textMuted} fontSize={8} fontWeight="600">
                    {v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}`}
                  </SvgText>
                </G>
              );
            })}
            {active.map((d) => {
              const pts = d.points.map((p, i) => ({ x: toX(i), y: toY(p.value) }));
              const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
              const fillPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${bottomY.toFixed(1)} L${pts[0].x.toFixed(1)},${bottomY.toFixed(1)} Z`;
              return (
                <G key={d.id}>
                  <Path d={fillPath} fill={`url(#mlg_${d.id})`} />
                  <Path d={linePath} stroke={d.color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={4} fill={d.color} />
                </G>
              );
            })}
            {xLabels.map((label, i) => (
              <SvgText key={i} x={toX(i)} y={height - 4} textAnchor="middle" fill={colors.textMuted} fontSize={8} fontWeight="600">
                {label}
              </SvgText>
            ))}
          </Svg>
        );
      })()}
    </View>
  );
}
