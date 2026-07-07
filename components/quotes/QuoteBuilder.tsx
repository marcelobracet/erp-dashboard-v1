'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Product, Quote, QuoteItem, QuotePaymentMethod } from '@/lib/api/services';
import { productService, quoteService } from '@/lib/api/services';
import { computeQuoteTotals, toQuoteItem, sumQuote } from '@/lib/utils/quoteCalc';
import { Switch } from '@/components/ui/Switch';

type EnvDraft = {
  id: string;
  name: string;
  items: ItemDraft[];
};

type ItemDraft = {
  id: string;
  product_id: string;
  quantity: number;
  width_m?: number;
  height_m?: number;
  length_m?: number;
  note?: string;
};

type ClientDraft = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function parseNum(raw: string): number | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  const normalized = v.replace(',', '.');
  const n = Number(normalized);
  if (Number.isNaN(n)) return undefined;
  return n;
}

function quoteItemToItemDraft(it: QuoteItem): ItemDraft {
  return {
    id: it.id,
    product_id: it.product_id ?? '',
    quantity: it.quantity > 0 ? it.quantity : 1,
    width_m: it.width_m,
    height_m: it.height_m,
    length_m: it.length_m,
    note: it.note,
  };
}

function buildEnvsFromQuote(q: Quote): EnvDraft[] {
  const rawItems = q.items ?? [];
  if (rawItems.length === 0 && (!q.environments || q.environments.length === 0)) {
    return [{ id: newId('env'), name: 'Ambiente 1', items: [] }];
  }
  const byItemId = new Map(rawItems.map((it) => [it.id, it]));

  if (q.environments && q.environments.length > 0) {
    return q.environments.map((e) => ({
      id: e.id || newId('env'),
      name: e.name || 'Ambiente',
      items: (e.item_ids ?? [])
        .map((iid) => byItemId.get(iid))
        .filter((it): it is QuoteItem => !!it)
        .map(quoteItemToItemDraft),
    }));
  }

  const byEnv = new Map<string, QuoteItem[]>();
  for (const it of rawItems) {
    const k = it.environment_id || '_default';
    const arr = byEnv.get(k) ?? [];
    arr.push(it);
    byEnv.set(k, arr);
  }
  let idx = 1;
  return Array.from(byEnv.entries()).map(([, arr]) => ({
    id: arr[0]?.environment_id || newId('env'),
    name: arr[0]?.environment_name || `Ambiente ${idx++}`,
    items: arr.map(quoteItemToItemDraft),
  }));
}

function clientDraftFromQuote(q: Quote): ClientDraft {
  const snap = q.client_snapshot;
  const c = q.client;
  return {
    name: (snap?.name ?? c?.name ?? '').trim(),
    phone: (snap?.phone ?? '').trim(),
    email: (snap?.email ?? '').trim(),
    address: (snap?.address ?? '').trim(),
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveClientIdForPayload(persistedClientId: string | undefined): {
  client_id: string;
  client: { id: string; name: string };
} {
  const raw = persistedClientId?.trim() ?? '';
  if (raw && raw !== 'manual' && UUID_RE.test(raw)) {
    return { client_id: raw, client: { id: raw, name: '' } };
  }
  return { client_id: 'manual', client: { id: 'manual', name: '' } };
}

type PaymentDraft = {
  paymentMethod: QuotePaymentMethod;
  paymentDiscountEnabled: boolean;
  discountPercent: number;
  paymentInstallmentsEnabled: boolean;
  installmentCount: number;
  /** Desconto fixo (R$) quando o desconto percentual está desligado ou em 0%. */
  discountFixedBrl: number;
};

const PAYMENT_METHODS: { id: QuotePaymentMethod; label: string }[] = [
  { id: 'pix', label: 'DINHEIRO/PIX' },
  { id: 'boleto', label: 'BOLETO' },
  { id: 'credit', label: 'CRÉDITO' },
  { id: 'debit', label: 'DÉBITO' },
];

function discountFixedFromLoadedQuote(q: Quote): number {
  if (q.payment_discount_enabled && (q.discount_percent ?? 0) > 0) return 0;
  return q.discount ?? 0;
}

function buildPayload(
  client: ClientDraft,
  envs: EnvDraft[],
  notes: string,
  allItems: QuoteItem[],
  status: 'draft' | 'pending',
  payment: PaymentDraft,
  opts?: { persistedClientId?: string },
): Partial<Quote> {
  const itemsWithProduct = allItems.filter((it) => it.product_id?.trim());
  const snapName =
    client.name.trim() ||
    (status === 'draft' ? 'Sem cliente (rascunho)' : '');
  const { client_id, client: clientRef } = resolveClientIdForPayload(opts?.persistedClientId);
  const subtotal = sumQuote(allItems);
  const legacyDisc =
    !payment.paymentDiscountEnabled || payment.discountPercent <= 0
      ? Math.max(0, payment.discountFixedBrl)
      : 0;
  const totals = computeQuoteTotals(subtotal, {
    paymentDiscountEnabled: payment.paymentDiscountEnabled,
    discountPercent: payment.discountPercent,
    discountFixed: legacyDisc,
  });
  return {
    status,
    total: totals.total,
    payment_method: payment.paymentMethod,
    payment_discount_enabled: payment.paymentDiscountEnabled,
    discount_percent: payment.discountPercent,
    payment_installments_enabled:
      payment.paymentMethod === 'credit' && payment.paymentInstallmentsEnabled,
    installment_count:
      payment.paymentMethod === 'credit' && payment.paymentInstallmentsEnabled
        ? payment.installmentCount
        : 0,
    discount: legacyDisc,
    items: itemsWithProduct,
    client_id,
    client: {
      id: clientRef.id,
      name: snapName || 'Sem cliente (rascunho)',
    },
    client_snapshot: {
      name: snapName || 'Sem cliente (rascunho)',
      phone: client.phone.trim() || undefined,
      email: client.email.trim() || undefined,
      address: client.address.trim() || undefined,
    },
    environments: envs.map((e) => ({
      id: e.id,
      name: e.name,
      item_ids: e.items.map((it) => it.id),
    })),
    notes: notes.trim() || undefined,
  };
}

export type QuoteSaveKind = 'draft' | 'final';

export default function QuoteBuilder({
  onSaved,
  onCancel,
  existingQuoteId,
  initialQuote,
}: {
  onSaved: (q: Quote, kind: QuoteSaveKind) => void;
  onCancel: () => void;
  /** Edição de orçamento existente (ex.: rascunho salvo). */
  existingQuoteId?: string;
  initialQuote?: Quote | null;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [client, setClient] = useState<ClientDraft>({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const [envs, setEnvs] = useState<EnvDraft[]>([
    { id: newId('env'), name: 'Ambiente 1', items: [] },
  ]);

  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<QuotePaymentMethod>('pix');
  const [paymentDiscountEnabled, setPaymentDiscountEnabled] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentInstallmentsEnabled, setPaymentInstallmentsEnabled] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(0);
  const [discountFixedBrl, setDiscountFixedBrl] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydratedSigRef = React.useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingProducts(true);
        const list = await productService.list();
        if (!mounted) return;
        setProducts(list.filter((p) => p.active !== false));
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!initialQuote?.id) return;
    const sig = `${initialQuote.id}:${initialQuote.updated_at ?? initialQuote.created_at ?? ''}`;
    if (hydratedSigRef.current === sig) return;
    hydratedSigRef.current = sig;
    setClient(clientDraftFromQuote(initialQuote));
    const nextEnvs = buildEnvsFromQuote(initialQuote);
    setEnvs(nextEnvs.length ? nextEnvs : [{ id: newId('env'), name: 'Ambiente 1', items: [] }]);
    setNotes(initialQuote.notes?.trim() ?? '');
    setPaymentMethod(initialQuote.payment_method ?? 'pix');
    setPaymentDiscountEnabled(initialQuote.payment_discount_enabled === true);
    setDiscountPercent(
      initialQuote.discount_percent != null ? Number(initialQuote.discount_percent) : 0,
    );
    setPaymentInstallmentsEnabled(initialQuote.payment_installments_enabled === true);
    setInstallmentCount(
      initialQuote.installment_count != null ? Math.max(0, initialQuote.installment_count) : 0,
    );
    setDiscountFixedBrl(discountFixedFromLoadedQuote(initialQuote));
  }, [initialQuote]);

  useEffect(() => {
    if (paymentMethod !== 'credit') {
      setPaymentInstallmentsEnabled(false);
      setInstallmentCount(0);
    }
  }, [paymentMethod]);

  const paymentDraft = useMemo(
    (): PaymentDraft => ({
      paymentMethod,
      paymentDiscountEnabled,
      discountPercent,
      paymentInstallmentsEnabled,
      installmentCount,
      discountFixedBrl,
    }),
    [
      paymentMethod,
      paymentDiscountEnabled,
      discountPercent,
      paymentInstallmentsEnabled,
      installmentCount,
      discountFixedBrl,
    ],
  );

  const productById = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const allItems: QuoteItem[] = useMemo(() => {
    const items: QuoteItem[] = [];
    for (const env of envs) {
      for (const it of env.items) {
        const p = productById.get(it.product_id);
        if (!p) continue;
        items.push(
          toQuoteItem(p, {
            id: it.id,
            product_id: it.product_id,
            quantity: it.quantity,
            width_m: it.width_m,
            height_m: it.height_m,
            length_m: it.length_m,
            note: it.note,
            environment_id: env.id,
            environment_name: env.name,
          }),
        );
      }
    }
    return items;
  }, [envs, productById]);

  const previewTotals = useMemo(() => {
    const sub = sumQuote(allItems);
    const legacy =
      !paymentDiscountEnabled || discountPercent <= 0
        ? Math.max(0, discountFixedBrl)
        : 0;
    return computeQuoteTotals(sub, {
      paymentDiscountEnabled,
      discountPercent,
      discountFixed: legacy,
    });
  }, [allItems, paymentDiscountEnabled, discountPercent, discountFixedBrl]);

  function updateEnv(envId: string, patch: Partial<EnvDraft>) {
    setEnvs((prev) => prev.map((e) => (e.id === envId ? { ...e, ...patch } : e)));
  }

  function addEnv() {
    setEnvs((prev) => [
      ...prev,
      { id: newId('env'), name: `Ambiente ${prev.length + 1}`, items: [] },
    ]);
  }

  function removeEnv(envId: string) {
    setEnvs((prev) => prev.filter((e) => e.id !== envId));
  }

  function addItem(envId: string) {
    setEnvs((prev) =>
      prev.map((env) => {
        if (env.id !== envId) return env;
        return {
          ...env,
          items: [
            ...env.items,
            {
              id: newId('it'),
              product_id: '',
              quantity: 1,
              width_m: 1,
              height_m: 0.6,
              length_m: 1,
              note: '',
            },
          ],
        };
      }),
    );
  }

  function updateItem(envId: string, itemId: string, patch: Partial<ItemDraft>) {
    setEnvs((prev) =>
      prev.map((env) => {
        if (env.id !== envId) return env;
        return {
          ...env,
          items: env.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
        };
      }),
    );
  }

  function removeItem(envId: string, itemId: string) {
    setEnvs((prev) =>
      prev.map((env) => {
        if (env.id !== envId) return env;
        return { ...env, items: env.items.filter((it) => it.id !== itemId) };
      }),
    );
  }

  async function handleSaveDraft() {
    setError(null);
    setSavingDraft(true);
    try {
      const payload = buildPayload(
        client,
        envs,
        notes,
        allItems,
        'draft',
        paymentDraft,
        { persistedClientId: existingQuoteId ? initialQuote?.client_id : undefined },
      );
      if (existingQuoteId) {
        const saved = await quoteService.update(existingQuoteId, payload);
        onSaved(saved, 'draft');
      } else {
        const saved = await quoteService.create(payload);
        onSaved(saved, 'draft');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar rascunho');
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleSaveFinal() {
    setError(null);

    if (!client.name.trim()) {
      setError('Informe o nome do cliente para finalizar o orçamento.');
      return;
    }

    if (allItems.length === 0) {
      setError('Adicione ao menos 1 item com produto selecionado.');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(
        client,
        envs,
        notes,
        allItems,
        'pending',
        paymentDraft,
        { persistedClientId: existingQuoteId ? initialQuote?.client_id : undefined },
      );
      if (existingQuoteId) {
        const saved = await quoteService.update(existingQuoteId, payload);
        onSaved(saved, 'final');
      } else {
        const saved = await quoteService.create(payload);
        onSaved(saved, 'final');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar orçamento');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-text-80">
        <strong className="text-foreground">Rascunho</strong> — use{' '}
        <span className="font-medium">Salvar rascunho</span> se ainda não tiver contato com o cliente. Você pode
        voltar depois em <span className="font-medium">Orçamentos → Continuar edição</span>. Para proposta
        oficial, informe o cliente e pelo menos um item e clique em <span className="font-medium">Finalizar orçamento</span>.
      </div>

      <div className="app-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Dados do cliente</h2>
        <p className="mt-1 text-xs text-text-60">
          No rascunho o nome pode ficar em branco (será marcado como sem cliente até você finalizar).
        </p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nome" value={client.name} onChange={(e) => setClient((p) => ({ ...p, name: e.target.value }))} />
          <Input label="Telefone" value={client.phone} onChange={(e) => setClient((p) => ({ ...p, phone: e.target.value }))} />
          <Input label="Email" value={client.email} onChange={(e) => setClient((p) => ({ ...p, email: e.target.value }))} />
          <Input label="Endereço" value={client.address} onChange={(e) => setClient((p) => ({ ...p, address: e.target.value }))} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Itens por ambiente</h2>
          <Button variant="outline" onClick={addEnv}>
            Adicionar ambiente
          </Button>
        </div>

        {envs.map((env) => (
          <div key={env.id} className="app-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <Input
                  label="Ambiente"
                  value={env.name}
                  onChange={(e) => updateEnv(env.id, { name: e.target.value })}
                />
              </div>
              {envs.length > 1 && (
                <Button variant="ghost" onClick={() => removeEnv(env.id)}>
                  Remover
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-text-80">Adicione produtos cadastrados e informe as medidas.</div>
              <Button onClick={() => addItem(env.id)} disabled={loadingProducts}>
                + Item
              </Button>
            </div>

            {env.items.length === 0 ? (
              <div className="text-sm text-text-60">Nenhum item neste ambiente.</div>
            ) : (
              <div className="space-y-4">
                {env.items.map((it) => {
                  const product = it.product_id ? productById.get(it.product_id) : undefined;
                  const pricing = product?.pricing_rule ?? 'por_unidade';

                  return (
                    <div key={it.id} className="rounded-xl border border-glass-10 bg-glass-5 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-text-80 mb-2">Produto</label>
                          <select
                            value={it.product_id}
                            onChange={(e) => updateItem(env.id, it.id, { product_id: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-20 focus:border-accent-hover"
                          >
                            <option value="">Selecione...</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.unit ?? 'un'})
                              </option>
                            ))}
                          </select>
                          {product && (
                            <div className="mt-2 text-xs text-text-60">
                              Regra: {pricing} • Preço: {product.price} / {product.unit}
                            </div>
                          )}
                        </div>

                        <div>
                          <Input
                            label="Quantidade"
                            type="number"
                            step="0.01"
                            value={String(it.quantity)}
                            onChange={(e) => {
                              const n = parseNum(e.target.value);
                              updateItem(env.id, it.id, { quantity: n && n > 0 ? n : 1 });
                            }}
                          />
                        </div>
                      </div>

                      {pricing === 'por_area' && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input
                            label="Largura (m)"
                            type="number"
                            step="0.01"
                            value={it.width_m == null ? '' : String(it.width_m)}
                            onChange={(e) => updateItem(env.id, it.id, { width_m: parseNum(e.target.value) ?? 0 })}
                          />
                          <Input
                            label="Altura (m)"
                            type="number"
                            step="0.01"
                            value={it.height_m == null ? '' : String(it.height_m)}
                            onChange={(e) => updateItem(env.id, it.id, { height_m: parseNum(e.target.value) ?? 0 })}
                          />
                          <div className="flex items-end">
                            <div className="w-full">
                              <label className="block text-sm font-medium text-text-80 mb-2">Unidade</label>
                              <div className="px-4 py-3 rounded-xl border border-glass-10 bg-background text-text-80">
                                m²
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {pricing === 'por_linear' && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input
                            label="Comprimento (m)"
                            type="number"
                            step="0.01"
                            value={it.length_m == null ? '' : String(it.length_m)}
                            onChange={(e) => updateItem(env.id, it.id, { length_m: parseNum(e.target.value) ?? 0 })}
                          />
                          <div className="md:col-span-2 flex items-end">
                            <div className="w-full">
                              <label className="block text-sm font-medium text-text-80 mb-2">Unidade</label>
                              <div className="px-4 py-3 rounded-xl border border-glass-10 bg-background text-text-80">
                                m
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-text-80 mb-2">Observação do item (aparece em vermelho)</label>
                        <textarea
                          value={it.note ?? ''}
                          onChange={(e) => updateItem(env.id, it.id, { note: e.target.value })}
                          className="w-full min-h-20 px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground placeholder:text-text-60 focus:outline-none focus:ring-2 focus:ring-accent-20 focus:border-accent-hover"
                          placeholder="Ex.: Incolor 08mm - Temperado | Cor perfil: Preto | Cor acessório: Preto"
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs text-text-60">
                          {product ? (
                            <>Subtotal calculado automaticamente no preview.</>
                          ) : (
                            <>Selecione um produto para calcular valores.</>
                          )}
                        </div>
                        <Button variant="ghost" onClick={() => removeItem(env.id, it.id)}>
                          Remover item
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="app-card p-6 space-y-6">
        <div className="flex items-center gap-2">
          <span className="text-accent text-lg" aria-hidden>
            💳
          </span>
          <h2 className="text-sm font-bold uppercase tracking-wide text-accent">
            Condições comerciais (indicativas)
          </h2>
        </div>
        <p className="text-xs text-text-60 leading-relaxed max-w-2xl">
          Forma de pagamento e descontos servem como referência na proposta. O acordo
          financeiro definitivo costuma ser fechado após aprovação do orçamento pelo cliente.
        </p>

        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => {
            const selected = paymentMethod === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  selected
                    ? 'border-accent bg-accent text-white shadow-sm'
                    : 'border-glass-10 bg-glass-5 text-text-60 hover:border-glass-20'
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    selected ? 'border-white bg-white/20' : 'border-glass-20 bg-background'
                  }`}
                >
                  {selected ? '✓' : ''}
                </span>
                {m.label}
              </button>
            );
          })}
        </div>

        <div className={`grid grid-cols-1 gap-4 ${paymentMethod === 'credit' ? 'sm:grid-cols-2' : ''}`}>
          <div className="rounded-2xl border border-glass-10 bg-glass-5 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-60">
                Desconto
              </span>
              <Switch
                checked={paymentDiscountEnabled}
                onCheckedChange={setPaymentDiscountEnabled}
                aria-label="Ativar desconto percentual"
                size="sm"
              />
            </div>
            {paymentDiscountEnabled ? (
              <div className="mt-4 flex flex-col items-center">
                <label className="sr-only" htmlFor="quote-discount-pct">
                  Percentual de desconto
                </label>
                <input
                  id="quote-discount-pct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={Number.isFinite(discountPercent) ? discountPercent : 0}
                  onChange={(e) => {
                    const n = parseNum(e.target.value);
                    setDiscountPercent(n != null ? Math.min(100, Math.max(0, n)) : 0);
                  }}
                  className="w-full max-w-32 border-0 bg-transparent text-center text-4xl font-bold tabular-nums text-foreground focus:outline-none focus:ring-0"
                />
                <span className="text-xs text-text-60">% sobre o subtotal</span>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <label className="text-xs text-text-60" htmlFor="quote-discount-fixed">
                  Desconto fixo (R$)
                </label>
                <input
                  id="quote-discount-fixed"
                  type="number"
                  min={0}
                  step={0.01}
                  value={discountFixedBrl}
                  onChange={(e) => {
                    const n = parseNum(e.target.value);
                    setDiscountFixedBrl(n != null ? Math.max(0, n) : 0);
                  }}
                  className="w-full rounded-xl border border-glass-10 bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
            )}
          </div>

          {paymentMethod === 'credit' ? (
            <div className="rounded-2xl border border-glass-10 bg-glass-5 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-60">
                  Parcelas
                </span>
                <Switch
                  checked={paymentInstallmentsEnabled}
                  onCheckedChange={setPaymentInstallmentsEnabled}
                  aria-label="Informar parcelamento"
                  size="sm"
                />
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={!paymentInstallmentsEnabled || installmentCount <= 0}
                  onClick={() =>
                    setInstallmentCount((c) => Math.max(0, c - 1))
                  }
                  className="rounded-lg border border-glass-10 px-3 py-2 text-sm disabled:opacity-40"
                  aria-label="Menos parcelas"
                >
                  −
                </button>
                <span className="min-w-16 text-center text-4xl font-bold tabular-nums text-foreground">
                  {paymentInstallmentsEnabled ? installmentCount : 0}
                </span>
                <button
                  type="button"
                  disabled={!paymentInstallmentsEnabled}
                  onClick={() =>
                    setInstallmentCount((c) => Math.min(48, c + 1))
                  }
                  className="rounded-lg border border-glass-10 px-3 py-2 text-sm disabled:opacity-40"
                  aria-label="Mais parcelas"
                >
                  +
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-text-60">
                0 = à vista · máx. 48x
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="app-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Observações gerais</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-3 w-full min-h-24 px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground placeholder:text-text-60 focus:outline-none focus:ring-2 focus:ring-accent-20 focus:border-accent-hover"
          placeholder="Condições, prazo, etc."
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-text-80 space-y-1">
          <div>
            Subtotal:{' '}
            <span className="font-medium text-foreground">
              R$ {previewTotals.subtotal.toFixed(2).replace('.', ',')}
            </span>
          </div>
          {previewTotals.discount > 0 && (
            <div>
              Desconto:{' '}
              <span className="font-medium text-foreground">
                − R$ {previewTotals.discount.toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}
          <div>
            Total:{' '}
            <span className="font-semibold text-foreground">
              R$ {previewTotals.total.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={() => void handleSaveDraft()} isLoading={savingDraft} disabled={saving}>
            Salvar rascunho
          </Button>
          <Button onClick={() => void handleSaveFinal()} isLoading={saving} disabled={savingDraft}>
            Finalizar orçamento
          </Button>
        </div>
      </div>
    </div>
  );
}
