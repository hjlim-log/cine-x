export const CHART_COLORS = {
  primary:   '#dc2626',
  secondary: '#f59e0b',

  // 멤버십 등급
  welcome: '#6b7280',
  vip:     '#dc2626',
  vvip:    '#7c3aed',
  lvip:    '#fbbf24',

  // 다중 시리즈용 팔레트 (영화관별, 영화별 등)
  palette: [
    '#dc2626',
    '#f59e0b',
    '#16a34a',
    '#2563eb',
    '#7c3aed',
    '#db2777',
    '#0891b2',
    '#059669',
    '#d97706',
    '#9333ea',
  ],
} as const;

/** ChartConfig 색상 배열을 빠르게 만드는 헬퍼 */
export function paletteConfig(keys: string[]) {
  return Object.fromEntries(
    keys.map((key, i) => [
      key,
      { color: CHART_COLORS.palette[i % CHART_COLORS.palette.length] },
    ]),
  );
}
