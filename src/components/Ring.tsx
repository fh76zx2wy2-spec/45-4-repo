import type { ReactNode } from 'react';

/** حلقة تقدّم دائرية. progress من 0 إلى 1 */
export function Ring({
  size = 220,
  stroke = 12,
  progress,
  color,
  children,
  className = '',
}: {
  size?: number;
  stroke?: number;
  progress: number;
  color?: string;
  children?: ReactNode;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <div className={`ring ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring-bg" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="ring-fg"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          style={color ? { stroke: color } : undefined}
        />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}
