import React from 'react';

export interface LineChartPoint {
  label: string;
  value: number;
}

export function LineChart({
  data,
  height = 160,
}: {
  data: LineChartPoint[];
  height?: number;
}) {
  const width = 600;
  const padX = 14;
  const padY = 12;

  const max = Math.max(1, ...data.map((d) => d.value));
  const innerW = width - padX * 2;
  const innerH = 100 - padY * 2;

  const points = data
    .map((d, i) => {
      const x = padX + (i / Math.max(1, data.length - 1)) * innerW;
      const y = padY + (1 - d.value / max) * innerH;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const area = `M ${padX},${100 - padY} L ${points.replaceAll(' ', ' L ')} L ${width - padX},${100 - padY} Z`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} 100`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Orçamentos ao longo do tempo"
      >
        <defs>
          <linearGradient id="lineArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grid */}
        {[20, 40, 60, 80].map((y) => (
          <line
            key={y}
            x1={padX}
            x2={width - padX}
            y1={y}
            y2={y}
            stroke="var(--color-glass-10)"
            strokeWidth="1"
          />
        ))}

        <path d={area} fill="url(#lineArea)" />
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-accent-90)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      <div className="mt-3 flex items-center justify-between text-xs text-text-60">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
