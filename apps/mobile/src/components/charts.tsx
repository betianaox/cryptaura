import { INTERVALS, cumulativeDepth, formatPrice, type Candle, type Interval, type OrderBook } from '@cryptaura/core';
import { Card, Txt, radius, spacing, useTheme } from '@cryptaura/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { useI18n } from '@/i18n';

function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [width, setWidth] = useState(0);
  return [width, (e) => setWidth(e.nativeEvent.layout.width)];
}

const CHART_HEIGHT = 190;
const VOLUME_HEIGHT = 36;

/** Velas con volumen debajo y el último precio marcado. */
export function PriceChart({
  candles,
  interval,
  onInterval,
}: {
  candles: Candle[];
  interval: Interval;
  onInterval: (interval: Interval) => void;
}) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const [width, onLayout] = useWidth();
  const visible = candles.slice(-60);

  let body = null;
  if (width > 0 && visible.length > 1) {
    const max = Math.max(...visible.map((c) => c.high));
    const min = Math.min(...visible.map((c) => c.low));
    const range = max - min || 1;
    const y = (v: number) => ((max - v) / range) * (CHART_HEIGHT - 12) + 6;
    const maxVol = Math.max(...visible.map((c) => c.volume), Number.EPSILON);
    const step = width / visible.length;
    const bodyWidth = Math.max(1, step * 0.6);
    const last = visible[visible.length - 1]!;
    body = (
      <Svg width={width} height={CHART_HEIGHT + VOLUME_HEIGHT}>
        <Line
          x1={0}
          x2={width}
          y1={y(last.close)}
          y2={y(last.close)}
          stroke={theme.textMuted}
          strokeDasharray="3 4"
          strokeWidth={StyleSheet.hairlineWidth * 2}
        />
        {visible.map((c, i) => {
          const x = i * step + step / 2;
          const color = c.close >= c.open ? theme.up : theme.down;
          const top = y(Math.max(c.open, c.close));
          const bottom = y(Math.min(c.open, c.close));
          const vh = (c.volume / maxVol) * (VOLUME_HEIGHT - 4);
          return (
            <G key={c.ts}>
              <Line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} />
              <Rect x={x - bodyWidth / 2} y={top} width={bodyWidth} height={Math.max(1, bottom - top)} fill={color} />
              <Rect
                x={x - bodyWidth / 2}
                y={CHART_HEIGHT + VOLUME_HEIGHT - vh}
                width={bodyWidth}
                height={vh}
                fill={color}
                opacity={0.35}
              />
            </G>
          );
        })}
      </Svg>
    );
  }

  const high = visible.length ? Math.max(...visible.map((c) => c.high)) : null;
  const low = visible.length ? Math.min(...visible.map((c) => c.low)) : null;

  return (
    <Card>
      <View style={styles.intervals}>
        {INTERVALS.map((i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityState={{ selected: i === interval }}
            onPress={() => onInterval(i)}
            style={[styles.interval, { backgroundColor: i === interval ? theme.accentSoft : 'transparent' }]}
          >
            <Txt variant="small" style={{ color: i === interval ? theme.accent : theme.textMuted, fontWeight: '700' }}>
              {i}
            </Txt>
          </Pressable>
        ))}
      </View>
      <View style={{ height: CHART_HEIGHT + VOLUME_HEIGHT }} onLayout={onLayout}>
        {body ?? <Txt variant="muted">{t.market.chartLoading}</Txt>}
      </View>
      {high !== null && low !== null ? (
        <View style={styles.range}>
          <Txt variant="small" numeric>
            {t.market.low} {formatPrice(low, locale)}
          </Txt>
          <Txt variant="small" numeric>
            {t.market.high} {formatPrice(high, locale)}
          </Txt>
        </View>
      ) : null}
    </Card>
  );
}

const DEPTH_HEIGHT = 140;

/** Gráfico de profundidad: cantidad acumulada de compras y ventas por precio. */
export function DepthChart({ book }: { book: OrderBook | null }) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const [width, onLayout] = useWidth();

  let body = null;
  if (book && width > 0 && book.bids.length > 1 && book.asks.length > 1) {
    const bids = cumulativeDepth(book.bids);
    const asks = cumulativeDepth(book.asks);
    const minP = bids[bids.length - 1]!.price;
    const maxP = asks[asks.length - 1]!.price;
    const maxTotal = Math.max(bids[bids.length - 1]!.total, asks[asks.length - 1]!.total);
    const x = (p: number) => ((p - minP) / (maxP - minP || 1)) * width;
    const y = (v: number) => DEPTH_HEIGHT - (v / maxTotal) * (DEPTH_HEIGHT - 6);
    const stepPath = (points: { price: number; total: number }[]) => {
      let d = `M ${x(points[0]!.price)} ${DEPTH_HEIGHT}`;
      let prevY = DEPTH_HEIGHT;
      for (const p of points) {
        d += ` L ${x(p.price)} ${prevY} L ${x(p.price)} ${y(p.total)}`;
        prevY = y(p.total);
      }
      d += ` L ${x(points[points.length - 1]!.price)} ${DEPTH_HEIGHT} Z`;
      return d;
    };
    body = (
      <Svg width={width} height={DEPTH_HEIGHT}>
        <Path d={stepPath(bids)} fill={theme.upSoft} stroke={theme.up} strokeWidth={1.5} />
        <Path d={stepPath(asks)} fill={theme.downSoft} stroke={theme.down} strokeWidth={1.5} />
      </Svg>
    );
  }

  return (
    <Card>
      <Txt variant="label">{t.market.depth}</Txt>
      <View style={{ height: DEPTH_HEIGHT }} onLayout={onLayout}>
        {body ?? <Txt variant="muted">{t.common.loading}</Txt>}
      </View>
      {book && book.bids.length > 0 && book.asks.length > 0 ? (
        <View style={styles.range}>
          <Txt variant="small" numeric style={{ color: theme.up }}>
            {t.market.bids} · {formatPrice(book.bids[book.bids.length - 1]!.price, locale)}
          </Txt>
          <Txt variant="small" numeric style={{ color: theme.down }}>
            {formatPrice(book.asks[book.asks.length - 1]!.price, locale)} · {t.market.asks}
          </Txt>
        </View>
      ) : null}
    </Card>
  );
}

/** Mini gráfico de línea (historial del índice, por ejemplo). */
export function Sparkline({ values, color, height = 36 }: { values: number[]; color: string; height?: number }) {
  const [width, onLayout] = useWidth();
  if (values.length < 2) return <View style={{ height }} />;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 3 - ((v - min) / range) * (height - 6)}`);
  return (
    <View style={{ height }} onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Path d={`M ${points.join(' L ')}`} stroke={color} strokeWidth={2} fill="none" />
        </Svg>
      ) : null}
    </View>
  );
}

/** Medidor semicircular del índice de miedo y codicia (0 a 100). */
export function Gauge({ value, size = 180 }: { value: number; size?: number }) {
  const theme = useTheme();
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const point = (v: number) => {
    const angle = Math.PI * (1 - v / 100);
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  };
  const arc = (from: number, to: number) => {
    const a = point(from);
    const b = point(to);
    return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
  };
  const bands = [
    { from: 0, to: 25, color: theme.down },
    { from: 25, to: 45, color: theme.warning },
    { from: 45, to: 55, color: theme.textMuted },
    { from: 55, to: 75, color: theme.accent },
    { from: 75, to: 100, color: theme.up },
  ];
  const needle = point(value);
  return (
    <Svg width={size} height={size / 2 + 12}>
      {bands.map((b) => (
        <Path key={b.from} d={arc(b.from + 1, b.to - 1)} stroke={b.color} strokeWidth={10} fill="none" strokeLinecap="round" />
      ))}
      <Line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={theme.text} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={cx} cy={cy} r={6} fill={theme.text} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  intervals: { flexDirection: 'row', gap: spacing.xs },
  interval: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  range: { flexDirection: 'row', justifyContent: 'space-between' },
});
