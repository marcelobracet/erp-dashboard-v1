/**
 * Contadores locais de aprovações (gamificação leve).
 * Persistência apenas no browser — nada sensível; pode migrar para API depois.
 */

const STORAGE_KEY = 'erp_quote_approval_celebration';

export type QuoteApprovalGamificationStats = {
  weekKey: string;
  weekCount: number;
  monthKey: string;
  monthCount: number;
  allTime: number;
};

type StoredShape = QuoteApprovalGamificationStats;

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week =
    Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7) || 1;
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function readStored(): StoredShape {
  if (typeof window === 'undefined') {
    return {
      weekKey: '',
      weekCount: 0,
      monthKey: '',
      monthCount: 0,
      allTime: 0,
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        weekKey: '',
        weekCount: 0,
        monthKey: '',
        monthCount: 0,
        allTime: 0,
      };
    }
    const p = JSON.parse(raw) as Partial<StoredShape>;
    return {
      weekKey: typeof p.weekKey === 'string' ? p.weekKey : '',
      weekCount: typeof p.weekCount === 'number' ? p.weekCount : 0,
      monthKey: typeof p.monthKey === 'string' ? p.monthKey : '',
      monthCount: typeof p.monthCount === 'number' ? p.monthCount : 0,
      allTime: typeof p.allTime === 'number' ? p.allTime : 0,
    };
  } catch {
    return {
      weekKey: '',
      weekCount: 0,
      monthKey: '',
      monthCount: 0,
      allTime: 0,
    };
  }
}

function writeStored(s: StoredShape) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore quota */
  }
}

const HEADLINES = [
  'Negócio fechado!',
  'Vitória do time comercial!',
  'Cliente disse sim — celebrar!',
  'Mais um fechamento no quadro!',
  'Aprovação registrada com estilo!',
];

const SUBLINES = [
  'Cada aprovação é resultado de trabalho em equipe.',
  'O esforço de vocês transforma proposta em receita.',
  'Continue nesse ritmo — o mercado percebe.',
  'Fechamento não é sorte: é preparo + relacionamento.',
  'Parabéns a quem construiu essa proposta do início ao fim.',
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]!;
}

/** Chame após persistir status `approved` com sucesso. Atualiza contadores e retorna stats + textos. */
export function recordApprovalCelebrationMeta(seed = Date.now()): {
  stats: QuoteApprovalGamificationStats;
  headline: string;
  subline: string;
} {
  const now = new Date();
  const wk = isoWeekKey(now);
  const mk = monthKey(now);
  const prev = readStored();

  let weekCount = prev.weekKey === wk ? prev.weekCount : 0;
  let monthCount = prev.monthKey === mk ? prev.monthCount : 0;

  weekCount += 1;
  monthCount += 1;
  const allTime = prev.allTime + 1;

  const stats: QuoteApprovalGamificationStats = {
    weekKey: wk,
    weekCount,
    monthKey: mk,
    monthCount,
    allTime,
  };
  writeStored(stats);

  return {
    stats,
    headline: pick(HEADLINES, seed),
    subline: pick(SUBLINES, seed + 17),
  };
}
