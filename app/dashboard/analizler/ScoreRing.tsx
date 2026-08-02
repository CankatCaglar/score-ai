import { scoreColor } from "./data";

export function ScoreRing({
  score,
  size = 44,
  stroke = 4,
  color: colorOverride,
  trackColor = "#00272c14",
}: {
  score: number;
  size?: number;
  stroke?: number;
  color?: string;
  /** Boş halka rengi — koyu arka planda daha açık bir ton kullanın. */
  trackColor?: string;
}) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = colorOverride ?? scoreColor(score);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute inset-0 flex flex-col items-center justify-center font-bold leading-none"
        style={{ color }}
      >
        <span style={{ fontSize: size * 0.28 }}>{score}</span>
        {size >= 80 && (
          <span
            className="font-medium opacity-50"
            style={{ fontSize: size * 0.12 }}
          >
            /100
          </span>
        )}
      </span>
    </div>
  );
}
