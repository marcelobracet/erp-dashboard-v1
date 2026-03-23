export type QuoteStatus = 'pending' | 'sent' | 'approved' | 'rejected' | 'draft';

export interface MockQuote {
  id: string;
  clientId: string;
  clientName: string;
  createdAt: string; // ISO
  status: QuoteStatus;
  total: number;
}

export interface MockClient {
  id: string;
  name: string;
  createdAt: string; // ISO
}

export interface MockDashboardData {
  now: string; // ISO
  quotes: MockQuote[];
  clients: MockClient[];
}

function toISODate(date: Date): string {
  return date.toISOString();
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function lcg(seed: number) {
  // Deterministic PRNG: 0..1
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function pick<T>(rand: () => number, items: T[]): T {
  return items[Math.floor(rand() * items.length)];
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function money(rand: () => number, min: number, max: number): number {
  const raw = min + rand() * (max - min);
  // Round to nearest 10
  return Math.round(raw / 10) * 10;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMockDashboardData(baseDateISO = '2026-02-10T12:00:00.000Z'): MockDashboardData {
  const now = new Date(baseDateISO);
  const rand = lcg(20260210);

  const clientNames = [
    'Granito Central',
    'Construtora Aurora',
    'Arquitetura Sólida',
    'Residencial Vista Bela',
    'Móveis Planejados Lima',
    'Condomínio Parque Norte',
    'Hotel Serra Dourada',
    'Cozinhas Prime',
    'Engenharia Horizonte',
    'Clínica Santa Luzia',
    'Restaurante Pedra & Brasa',
    'Loja Casa & Design',
    'Oficina do Mármore',
    'Imobiliária Novo Lar',
    'Ateliê Formas',
    'Academia Energia',
    'Farmácia Bem-Estar',
    'Padaria Pão de Pedra',
    'Escritório Atlas',
    'Boutique Jardim',
    'Condomínio Bela Praça',
    'Vila das Pedras',
  ];

  const clients: MockClient[] = clientNames.map((name, i) => {
    const id = `c_${String(i + 1).padStart(3, '0')}`;

    const bias = rand() < 0.45 ? clampInt(rand() * 25, 0, 25) : clampInt(25 + rand() * 95, 25, 120);
    const createdAt = addDays(now, -bias);

    return {
      id,
      name,
      createdAt: toISODate(createdAt),
    };
  });

  // Quotes: per day over last 180 days.
  const quotes: MockQuote[] = [];
  const daysBack = 180;
  const today = startOfDay(now);

  const statusWeights: Array<{ status: QuoteStatus; weight: number }> = [
    { status: 'sent', weight: 0.45 },
    { status: 'approved', weight: 0.28 },
    { status: 'rejected', weight: 0.20 },
    { status: 'draft', weight: 0.07 },
  ];

  const weightedStatus = () => {
    const r = rand();
    let acc = 0;
    for (const { status, weight } of statusWeights) {
      acc += weight;
      if (r <= acc) return status;
    }
    return 'sent' as const;
  };

  let seq = 1;
  for (let day = daysBack; day >= 0; day--) {
    const date = addDays(today, -day);

    // Seasonal-ish volume: more quotes in current month.
    const mk = monthKey(date);
    const currentMk = monthKey(now);
    const base = mk === currentMk ? 2.6 : 1.6;
    const daily = clampInt((rand() + rand()) * base * 2.2, 0, 6);

    for (let j = 0; j < daily; j++) {
      const client = pick(rand, clients);
      const status = weightedStatus();

      // Totals: larger for approved/sent.
      const total =
        status === 'approved'
          ? money(rand, 1800, 22000)
          : status === 'sent'
            ? money(rand, 1200, 18000)
            : status === 'rejected'
              ? money(rand, 900, 16000)
              : money(rand, 500, 9000);

      quotes.push({
        id: `q_${String(seq++).padStart(5, '0')}`,
        clientId: client.id,
        clientName: client.name,
        createdAt: toISODate(addDays(date, 0)),
        status,
        total,
      });
    }
  }

  return {
    now: toISODate(now),
    quotes,
    clients,
  };
}
