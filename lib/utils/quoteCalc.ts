import type { Product, QuoteItem } from '@/lib/api/services';

export type QuoteItemDraft = {
  id?: string;
  product_id: string;
  quantity: number;
  width_m?: number;
  height_m?: number;
  length_m?: number;
  note?: string;
  environment_id?: string;
  environment_name?: string;
};

export function calcChargeableQuantity(
  product: Product,
  draft: QuoteItemDraft
): {
  unit: NonNullable<Product['unit']>;
  baseQuantity: number;
  chargedQuantity: number;
  unitPrice: number;
  subtotal: number;
  description: string;
} {
  const unit = product.unit ?? 'un';
  const pricing = product.pricing_rule ?? 'por_unidade';

  const quantity = Number.isFinite(draft.quantity) && draft.quantity > 0 ? draft.quantity : 1;
  const unitPrice = Number(product.price ?? 0);

  let baseQuantity = 0;

  if (pricing === 'por_area') {
    const w = draft.width_m ?? 0;
    const h = draft.height_m ?? 0;
    baseQuantity = w * h * quantity;
  } else if (pricing === 'por_linear') {
    const l = draft.length_m ?? 0;
    baseQuantity = l * quantity;
  } else {
    baseQuantity = quantity;
  }

  const waste = product.waste_percent ?? 0;
  const withWaste = baseQuantity * (1 + waste / 100);

  const minimum = product.minimum_charge;
  const chargedQuantity = typeof minimum === 'number' && minimum > 0 ? Math.max(withWaste, minimum) : withWaste;

  const subtotal = chargedQuantity * unitPrice;

  const pieces = [
    product.name,
    product.thickness_mm != null ? `${product.thickness_mm}mm` : null,
    product.finish ?? null,
    product.line ? `Linha: ${product.line}` : null,
  ].filter(Boolean);

  return {
    unit,
    baseQuantity,
    chargedQuantity,
    unitPrice,
    subtotal,
    description: pieces.join(' • '),
  };
}

export function toQuoteItem(product: Product, draft: QuoteItemDraft): QuoteItem {
  const computed = calcChargeableQuantity(product, draft);

  return {
    id: draft.id ?? `qi_${Math.random().toString(16).slice(2)}_${Date.now()}`,
    product_id: product.id,
    product,

    quantity: draft.quantity,
    price: computed.unitPrice,
    subtotal: computed.subtotal,

    unit: computed.unit,
    pricing_rule: product.pricing_rule ?? 'por_unidade',

    width_m: draft.width_m,
    height_m: draft.height_m,
    length_m: draft.length_m,

    base_quantity: computed.baseQuantity,
    charged_quantity: computed.chargedQuantity,
    note: draft.note,
    description: computed.description,

    environment_id: draft.environment_id,
    environment_name: draft.environment_name,
  };
}

export function sumQuote(items: QuoteItem[]): number {
  return items.reduce((acc, it) => acc + Number(it.subtotal ?? 0), 0);
}
