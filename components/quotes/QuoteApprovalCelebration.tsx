'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import type { QuoteApprovalGamificationStats } from '@/lib/gamification/quoteApprovalStats';
import Button from '@/components/ui/Button';

export type QuoteApprovalCelebrationPayload = {
  stats: QuoteApprovalGamificationStats;
  headline: string;
  subline: string;
  clientName?: string;
  totalValueFormatted?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  payload: QuoteApprovalCelebrationPayload | null;
};

function useConfettiBurst(active: boolean) {
  const rafRef = useRef<number>(0);
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!active || reducedMotion) return;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:199;';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      canvas.remove();
      return;
    }

    const colors = ['#1ac8db', '#0292b7', '#233dff', '#99dfec', '#8c756a', '#f4f6fc'];

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      w: number;
      h: number;
      r: number;
      vr: number;
      c: string;
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const parts: Particle[] = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: -24 - Math.random() * canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 7,
      vy: 1.5 + Math.random() * 5,
      w: 3 + Math.random() * 6,
      h: 4 + Math.random() * 9,
      r: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.22,
      c: colors[Math.floor(Math.random() * colors.length)]!,
    }));

    const gravity = 0.09;
    const start = performance.now();
    const duration = 3400;

    const tick = (now: number) => {
      const t = now - start;
      const fade = Math.max(0, 1 - t / duration);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of parts) {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = fade * 0.92;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (t < duration) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        canvas.remove();
        window.removeEventListener('resize', resize);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      canvas.remove();
    };
  }, [active, reducedMotion]);
}

export function QuoteApprovalCelebration({ open, onClose, payload }: Props) {
  useConfettiBurst(open && !!payload);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onKeyDown]);

  if (!open || !payload) return null;

  const { stats, headline, subline, clientName, totalValueFormatted } = payload;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-celebration-title"
      aria-describedby="quote-celebration-desc"
    >
      <button
        type="button"
        className="absolute inset-0 bg-overlay-90 backdrop-blur-sm"
        aria-label="Fechar celebração"
        onClick={onClose}
      />

      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-glass-15 bg-glass-5 shadow-2xl backdrop-blur-xl motion-reduce:animate-none animate-[celebration-card-in_0.55s_cubic-bezier(0.22,1,0.36,1)_both]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-brand-cyan/15 blur-3xl" />

        <div className="relative px-8 pb-8 pt-10 text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-20 text-3xl shadow-lg"
            aria-hidden
          >
            🏆
          </div>

          <h2
            id="quote-celebration-title"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            {headline}
          </h2>

          <p id="quote-celebration-desc" className="mt-3 text-sm leading-relaxed text-text-80">
            {subline}
          </p>

          {(clientName || totalValueFormatted) && (
            <div className="mt-5 rounded-xl border border-glass-10 bg-glass-5 px-4 py-3 text-left text-sm">
              {clientName && (
                <p className="text-foreground">
                  <span className="text-text-60">Cliente</span>{' '}
                  <span className="font-semibold">{clientName}</span>
                </p>
              )}
              {totalValueFormatted && (
                <p className="mt-1 text-foreground">
                  <span className="text-text-60">Valor</span>{' '}
                  <span className="font-semibold text-accent-detail">{totalValueFormatted}</span>
                </p>
              )}
            </div>
          )}

          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-glass-10 bg-glass-5 px-2 py-3">
              <div className="text-lg font-bold text-accent-detail">{stats.weekCount}</div>
              <div className="text-[10px] uppercase tracking-wide text-text-60">Semana</div>
            </div>
            <div className="rounded-lg border border-glass-10 bg-glass-5 px-2 py-3">
              <div className="text-lg font-bold text-accent-detail">{stats.monthCount}</div>
              <div className="text-[10px] uppercase tracking-wide text-text-60">Mês</div>
            </div>
            <div className="rounded-lg border border-glass-10 bg-glass-5 px-2 py-3">
              <div className="text-lg font-bold text-accent-detail">{stats.allTime}</div>
              <div className="text-[10px] uppercase tracking-wide text-text-60">Total app</div>
            </div>
          </div>

          <p className="mt-4 text-xs text-text-60">
            Contadores são locais neste navegador — dão ritmo ao time; depois dá para ligar ao servidor.
          </p>

          <div className="mt-6">
            <Button type="button" variant="primary" fullWidth onClick={onClose}>
              Continuar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
