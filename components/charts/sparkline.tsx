// 12-point sparkline: trend in the de-emphasis gray, current period in white.
export function Sparkline({
  data,
  width = 88,
  height = 30,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (width - pad * 2),
    pad + (1 - (v - min) / range) * (height - pad * 2),
  ]);
  const toStr = (p: number[][]) => p.map(([x, y]) => `${x},${y}`).join(" ");
  const last = pts[pts.length - 1];

  return (
    <svg width={width} height={height} aria-hidden className="shrink-0">
      <polyline
        points={toStr(pts)}
        fill="none"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={toStr(pts.slice(-2))}
        fill="none"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill="#FFFFFF" stroke="#17181B" strokeWidth={1.5} />
    </svg>
  );
}
