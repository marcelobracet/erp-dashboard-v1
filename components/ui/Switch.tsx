import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  'aria-label'?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  size = 'md',
  'aria-label': ariaLabel = 'Alternar',
}: SwitchProps) {
  const track =
    size === 'sm'
      ? 'h-5 w-9'
      : 'h-6 w-11';
  const thumb =
    size === 'sm'
      ? 'h-4 w-4'
      : 'h-5 w-5';
  const translate =
    size === 'sm'
      ? 'translate-x-4'
      : 'translate-x-5';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex ${track} items-center rounded-full border border-glass-10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer'
      } ${checked ? 'bg-accent-20' : 'bg-glass-10'}`}
    >
      <span
        className={`inline-block ${thumb} transform rounded-full bg-background shadow transition-transform ${
          checked ? translate : 'translate-x-1'
        }`}
      />
    </button>
  );
}
