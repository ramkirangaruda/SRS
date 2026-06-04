// A small circular progress ring drawn with SVG (no dependency). We draw two
// circles: a faint background track and a colored arc whose length is set via
// strokeDasharray/strokeDashoffset to represent the percentage. Green when fully
// paid, blue otherwise. Plain component — usable in Server Components.
export function CircularProgress({
  value, // 0..100
  size = 72,
  stroke = 8,
}: {
  value: number;
  size?: number;
  stroke?: number;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // The arc length to show = percentage of the full circumference. The "offset"
  // is the remaining (hidden) part.
  const offset = circumference - (clamped / 100) * circumference;
  const color = clamped >= 100 ? "text-green-600" : "text-blue-600";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className="stroke-muted"
          fill="none"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${color} stroke-current transition-all`}
          fill="none"
        />
      </svg>
      {/* Percentage label centered on top of the ring */}
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
        {clamped}%
      </span>
    </div>
  );
}
