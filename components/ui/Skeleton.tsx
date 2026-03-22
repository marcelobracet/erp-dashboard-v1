import React from 'react';

export type SkeletonVariant = 'text' | 'rectangular' | 'rounded' | 'circular';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

function sizeStyle(
  width?: number | string,
  height?: number | string
): React.CSSProperties {
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height;
  return style;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className,
  style,
  'aria-label': ariaLabel = 'Carregando',
}: SkeletonProps) {
  const radiusClass =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'rounded'
        ? 'rounded-xl'
        : variant === 'rectangular'
          ? 'rounded-md'
          : 'rounded';

  const defaultSize =
    variant === 'text'
      ? ({ height: height ?? 14, width: width ?? '100%' } as const)
      : ({ height: height ?? 16, width: width ?? '100%' } as const);

  return (
    <span
      aria-busy="true"
      aria-label={ariaLabel}
      className={`skeleton ${radiusClass} inline-block align-middle ${className ?? ''}`}
      style={{ ...sizeStyle(defaultSize.width, defaultSize.height), ...style }}
    />
  );
}
