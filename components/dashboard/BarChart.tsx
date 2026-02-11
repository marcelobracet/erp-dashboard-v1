import React from 'react';

export interface BarChartDatum {
  label: string;
  approved: number;
  rejected: number;
}

export function BarChart({
  data,
  height = 180,
}: {
  data: BarChartDatum[];
  height?: number;
}) {
  const width = 600;
  const padX = 18;
  const padTop = 12;
  const padBottom = 18;
  const chartH = 100 - padTop - padBottom;

  const max = Math.max(1, ...data.flatMap((d) => [d.approved, d.rejected]));

  const groupW = (width - padX * 2) / Math.max(1, data.length);
  const barW = Math.max(6, groupW * 0.26);
  const gap = barW * 0.18;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} 100`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Aprovados vs rejeitados"
      >
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

        {data.map((d, i) => {
          const baseX = padX + i * groupW + groupW / 2;

          const hA = (d.approved / max) * chartH;
          const hR = (d.rejected / max) * chartH;

          const xA = baseX - barW - gap / 2;
          const xR = baseX + gap / 2;

          const yA = padTop + (chartH - hA);
          const yR = padTop + (chartH - hR);

          return (
            <g key={d.label}>
              <rect
                x={xA}
                y={yA}
                width={barW}
                height={hA}
                rx={2}
                fill="var(--color-accent-90)"
              />
              <rect
                x={xR}
                y={yR}
                width={barW}
                height={hR}
                rx={2}
                fill="rgba(248, 113, 113, 0.75)"
              />
            </g>
          );
        })}
      </svg>

      <div className="mt-3 grid grid-cols-6 gap-2 text-xs text-text-60">
        {data.map((d) => (
          <div key={d.label} className="truncate">
            {d.label}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2 text-text-60">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--color-accent-90)' }} />
          <span>Aprovados</span>
        </div>
        <div className="flex items-center gap-2 text-text-60">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'rgba(248, 113, 113, 0.75)' }} />
          <span>Rejeitados</span>
        </div>
      </div>
    </div>
  );
}
