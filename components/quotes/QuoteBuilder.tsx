'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Product, Quote, QuoteItem } from '@/lib/api/services';
import { productService, quoteService } from '@/lib/api/services';
import { toQuoteItem, sumQuote } from '@/lib/utils/quoteCalc';

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

export default function QuoteBuilder({
  onSaved,
  onCancel,
}: {
  onSaved: (q: Quote) => void;
  onCancel: () => void;
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          })
        );
      }
    }
    return items;
  }, [envs, productById]);

  const total = useMemo(() => sumQuote(allItems), [allItems]);

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
      })
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
      })
    );
  }

  function removeItem(envId: string, itemId: string) {
    setEnvs((prev) =>
      prev.map((env) => {
        if (env.id !== envId) return env;
        return { ...env, items: env.items.filter((it) => it.id !== itemId) };
      })
    );
  }

  async function handleSave() {
    setError(null);

    if (!client.name.trim()) {
      setError('Informe o nome do cliente.');
      return;
    }

    if (allItems.length === 0) {
      setError('Adicione ao menos 1 item no orçamento.');
      return;
    }

    setSaving(true);
    try {
      const quotePayload: Partial<Quote> = {
        status: 'pending',
        total,
        items: allItems,
        client_id: 'manual',
        client: { id: 'manual', name: client.name.trim() },
        client_snapshot: {
          name: client.name.trim(),
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

      const saved = await quoteService.create(quotePayload);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar orçamento');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="app-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Dados do cliente</h2>
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

      <div className="app-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Observações gerais</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-3 w-full min-h-24 px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground placeholder:text-text-60 focus:outline-none focus:ring-2 focus:ring-accent-20 focus:border-accent-hover"
          placeholder="Condições, prazo, etc."
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-text-80">
          Total estimado: <span className="font-semibold text-foreground">R$ {total.toFixed(2).replace('.', ',')}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} isLoading={saving}>
            Salvar orçamento
          </Button>
        </div>
      </div>
    </div>
  );
}
