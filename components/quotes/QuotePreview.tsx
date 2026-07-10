'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { Quote, QuoteItem } from '@/lib/api/services';
import { formatCurrency } from '@/lib/utils/format';
import { settingsService } from '@/lib/api/services';
import { quoteItemSpecLine, quoteItemTitle, quoteItemUserNote } from '@/lib/quotes/enrichQuoteItems';
import { getQuoteDiscountSummary } from '@/lib/quotes/discountSummary';
import { getStorageReadUrl } from '@/lib/api/uploads';
import Image from 'next/image';

function fmtNum(n: number | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return '-';
  return n.toFixed(digits).replace('.', ',');
}

function itemDims(item: QuoteItem): string {
  if (item.pricing_rule === 'por_area') {
    const w = fmtNum(item.width_m, 2);
    const h = fmtNum(item.height_m, 2);
    return `${w} × ${h} m`;
  }
  if (item.pricing_rule === 'por_linear') {
    const l = fmtNum(item.length_m, 2);
    return `${l} m`;
  }
  return '-';
}

export default function QuotePreview({ quote }: { quote: Quote }) {
  const clientName = quote.client_snapshot?.name ?? quote.client?.name ?? 'Cliente';

  const [companyName, setCompanyName] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');

  const created = quote.created_at
    ? new Date(quote.created_at).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  const items = useMemo(() => quote.items ?? [], [quote.items]);
  const discountSummary = useMemo(() => getQuoteDiscountSummary(quote), [quote]);

  const envSections = useMemo(() => {
    const byId = new Map<string, QuoteItem>();
    for (const it of items) byId.set(it.id, it);

    const assignByPosition = (): Map<number, QuoteItem[]> | null => {
      if (!quote.environments?.length || items.length === 0) return null;
      let resolved = 0;
      for (const env of quote.environments) {
        for (const id of env.item_ids ?? []) {
          if (byId.has(id)) resolved++;
        }
      }
      if (resolved > 0) return null;
      const slots = new Map<number, QuoteItem[]>();
      let cursor = 0;
      quote.environments.forEach((env, idx) => {
        const count = (env.item_ids ?? []).length;
        if (count <= 0) {
          slots.set(idx, []);
          return;
        }
        slots.set(idx, items.slice(cursor, cursor + count));
        cursor += count;
      });
      if (cursor === 0) return null;
      return slots;
    };

    const positional = assignByPosition();

    // Prefer explicit environments ordering
    if (quote.environments && quote.environments.length > 0) {
      return quote.environments.map((env, idx) => {
        let envItems = (env.item_ids ?? [])
          .map((id) => byId.get(id))
          .filter(Boolean) as QuoteItem[];
        if (envItems.length === 0 && positional?.has(idx)) {
          envItems = positional.get(idx) ?? [];
        }
        const subtotal = envItems.reduce((acc, it) => acc + Number(it.subtotal ?? 0), 0);
        return { id: env.id, name: env.name, items: envItems, subtotal };
      });
    }

    // Fallback: group by environment_name if present
    const groups = new Map<string, QuoteItem[]>();
    for (const it of items) {
      const key = it.environment_name?.trim() || 'Itens';
      const arr = groups.get(key) ?? [];
      arr.push(it);
      groups.set(key, arr);
    }

    return Array.from(groups.entries()).map(([name, envItems], idx) => ({
      id: `env_${idx}`,
      name,
      items: envItems,
      subtotal: envItems.reduce((acc, it) => acc + Number(it.subtotal ?? 0), 0),
    }));
  }, [items, quote.environments]);

  useEffect(() => {
    // Try API settings first; fallback to localStorage keys.
    let mounted = true;
    (async () => {
      let nextName = '';
      let nextLogo = '';
      try {
        const res = await settingsService.get();
        const settings = res?.settings ?? {};
        nextName = String(settings.company_name ?? '').trim();
        nextLogo = String(settings.logo_url ?? '').trim();
      } catch {
        // ignore
      }

      if (!mounted) return;

      if (nextName) setCompanyName(nextName);
      if (nextLogo) {
        try {
          const resolved = await getStorageReadUrl(nextLogo);
          if (mounted) setLogoUrl(resolved);
        } catch {
          if (mounted) setLogoUrl('');
        }
      }

      try {
        const lsName = String(window.localStorage.getItem('company_name') ?? '').trim();
        const lsLogo = String(window.localStorage.getItem('logo_url') ?? '').trim();
        if (!nextName && lsName) setCompanyName(lsName);
        if (!nextLogo && lsLogo) {
          try {
            const resolved = await getStorageReadUrl(lsLogo);
            if (mounted) setLogoUrl(resolved);
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="bg-background text-foreground print:bg-white print:text-[#050a30] rounded-xl border border-glass-10 overflow-hidden">
      {/* Header (logo + info) */}
      <div className="p-6 border-b border-glass-10 print:border-[#e6eaf7]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#8c756a]">Orçamento</div>
            <div className="text-2xl font-bold mt-1">#{quote.id.slice(0, 8).toUpperCase()}</div>
            <div className="text-sm text-text-60 print:text-[#050a30]/70 mt-1">Data: {created}</div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="w-[200px] h-[110px] flex items-center justify-end">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={companyName || 'Logo da empresa'}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <Image
                  src="/logo-texto.svg"
                  alt="Logo"
                  width={200}
                  height={110}
                  className="max-w-full max-h-full object-contain"
                  priority
                />
              )}
            </div>

            <div className="text-right">
              <div className="text-sm font-semibold">{companyName || 'Empresa'}</div>
              <div className="text-xs text-text-60 print:text-[#050a30]/70">Proposta de fornecimento e instalação</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-glass-10 print:border-[#e6eaf7] p-4">
            <div className="text-xs uppercase tracking-wider text-[#8c756a]">Cliente</div>
            <div className="mt-1 font-semibold">{clientName}</div>
            {quote.client_snapshot?.phone && (
              <div className="text-sm text-text-60 print:text-[#050a30]/70">Telefone: {quote.client_snapshot.phone}</div>
            )}
            {quote.client_snapshot?.email && (
              <div className="text-sm text-text-60 print:text-[#050a30]/70">Email: {quote.client_snapshot.email}</div>
            )}
            {quote.client_snapshot?.address && (
              <div className="text-sm text-text-60 print:text-[#050a30]/70">Endereço: {quote.client_snapshot.address}</div>
            )}
          </div>

          <div className="rounded-lg border border-glass-10 print:border-[#e6eaf7] p-4">
            <div className="text-xs uppercase tracking-wider text-[#8c756a]">Resumo</div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-text-60 print:text-[#050a30]/70">Status</span>
              <span className="font-medium capitalize">{quote.status}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-text-60 print:text-[#050a30]/70">Itens</span>
              <span className="font-medium">{items.length}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-glass-10 print:border-[#e6eaf7] flex items-center justify-between">
              <span className="text-sm text-text-60 print:text-[#050a30]/70">Total</span>
              <span className="text-xl font-bold text-[#16a34a]">{formatCurrency(quote.total ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          {envSections.map((env) => (
            <div key={env.id} className="rounded-xl border border-glass-10 print:border-[#e6eaf7] overflow-hidden">
              <div className="px-4 py-2 bg-glass-5 print:bg-[#f4f6fc] border-b border-glass-10 print:border-[#e6eaf7]">
                <div className="text-sm font-semibold uppercase tracking-wide">{env.name}</div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-[#8c756a] border-b border-glass-10 print:border-[#e6eaf7]">
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-4">Medidas</th>
                      <th className="py-3 px-4 text-right">Qtde</th>
                      <th className="py-3 px-4">Un</th>
                      <th className="py-3 px-4 text-right">V. Unit</th>
                      <th className="py-3 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-10 print:divide-[#e6eaf7]">
                    {env.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-3 px-4 align-top">
                          <div className="font-medium">{quoteItemTitle(it)}</div>
                          {quoteItemSpecLine(it) ? (
                            <div className="text-xs text-text-60 print:text-[#050a30]/65 mt-1">{quoteItemSpecLine(it)}</div>
                          ) : null}
                          {quoteItemUserNote(it) ? (
                            <div className="text-xs mt-1 text-red-600">{quoteItemUserNote(it)}</div>
                          ) : null}
                        </td>
                        <td className="py-3 px-4 text-text-60 print:text-[#050a30]/75 align-top">{itemDims(it)}</td>
                        <td className="py-3 px-4 text-right align-top">
                          {fmtNum(it.charged_quantity ?? it.quantity, 2)}
                        </td>
                        <td className="py-3 px-4 text-text-60 print:text-[#050a30]/75 align-top">{it.unit ?? it.product?.unit ?? '-'}</td>
                        <td className="py-3 px-4 text-right align-top">{formatCurrency(it.price ?? 0)}</td>
                        <td className="py-3 px-4 text-right font-semibold align-top">{formatCurrency(it.subtotal ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-glass-10 print:border-[#e6eaf7] bg-glass-5 print:bg-white">
                <span className="text-xs uppercase tracking-wider text-[#8c756a]">Subtotal</span>
                <span className="text-sm font-semibold">{formatCurrency(env.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>

        {quote.notes && (
          <div className="mt-6 rounded-lg border border-glass-10 print:border-[#e6eaf7] p-4">
            <div className="text-xs uppercase tracking-wider text-[#8c756a]">Observações</div>
            <div className="mt-2 text-sm text-text-80 print:text-[#050a30]/80 whitespace-pre-wrap">{quote.notes}</div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end">
          <div className="w-full max-w-sm rounded-lg border border-[#e6eaf7] p-4 space-y-3">
            {discountSummary ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-60 print:text-[#050a30]/70">Subtotal</span>
                  <span className="text-sm font-medium">{formatCurrency(discountSummary.subtotal)}</span>
                </div>
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Desconto aplicado</span>
                    <span className="font-semibold text-amber-700 print:text-amber-800">
                      − {formatCurrency(discountSummary.discountAmount)}
                    </span>
                  </div>
                  <div className="text-xs text-text-60 print:text-[#050a30]/70 mt-1">
                    {discountSummary.mode === 'percent'
                      ? `Percentual (${discountSummary.rateLabel})`
                      : 'Valor fixo (R$)'}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-glass-10 print:border-[#e6eaf7]">
                  <span className="text-sm text-text-60 print:text-[#050a30]/70">Total</span>
                  <span className="text-2xl font-extrabold text-[#16a34a]">{formatCurrency(discountSummary.total)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-60 print:text-[#050a30]/70">Total</span>
                <span className="text-2xl font-extrabold text-[#16a34a]">{formatCurrency(quote.total ?? 0)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-xs text-text-60 print:text-[#050a30]/60">
          Valores sujeitos à confirmação de medidas em obra. Prazo e condições a combinar.
        </div>
      </div>
    </div>
  );
}
