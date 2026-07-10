import type { Quote } from "@/lib/api/services";
import { computeQuoteTotals, sumQuote } from "@/lib/utils/quoteCalc";

export type QuoteDiscountMode = "percent" | "fixed";

export interface QuoteDiscountSummary {
  mode: QuoteDiscountMode;
  subtotal: number;
  discountAmount: number;
  total: number;
  /** Ex.: "10%" ou valor formatado pelo caller */
  rateLabel: string;
}

export function getQuoteDiscountSummary(
  quote: Quote,
): QuoteDiscountSummary | null {
  const items = quote.items ?? [];
  const subtotal = items.length > 0 ? sumQuote(items) : (quote.subtotal ?? quote.total ?? 0);

  const usePercent =
    quote.payment_discount_enabled === true &&
    (quote.discount_percent ?? 0) > 0;

  const totals = computeQuoteTotals(subtotal, {
    paymentDiscountEnabled: usePercent,
    discountPercent: quote.discount_percent ?? 0,
    discountFixed: usePercent ? 0 : Math.max(0, quote.discount ?? 0),
  });

  if (totals.discount <= 0) return null;

  return {
    mode: usePercent ? "percent" : "fixed",
    subtotal: totals.subtotal,
    discountAmount: totals.discount,
    total: totals.total,
    rateLabel: usePercent
      ? `${Number(quote.discount_percent).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
      : "",
  };
}
