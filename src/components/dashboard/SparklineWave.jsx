import { memo } from "react";

export const SparklineWave = memo(function SparklineWave({
  color = "#10B981",
  id = "spark1",
  pathD = "M 0 30 Q 40 8, 80 24 T 160 14 T 220 26 T 280 10",
  activePoint = { x: 220, y: 26 },
}) {
  return (
    <div className="w-full h-11 mt-2.5 overflow-hidden">
      <svg viewBox="0 0 280 40" className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <path d={`${pathD} L 280 40 L 0 40 Z`} fill={`url(#${id})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
        {activePoint && (
          <circle
            cx={activePoint.x}
            cy={activePoint.y}
            r="3.5"
            fill={color}
            stroke="#121522"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
});

export default SparklineWave;
