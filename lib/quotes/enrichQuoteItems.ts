import type { Product, QuoteItem } from "@/lib/api/services";

/** API persiste descrição + observação do usuário em `note` separados por " | ". */
export function splitStoredItemNote(note?: string): {
  descriptionLine: string;
  userNote?: string;
} {
  const raw = note?.trim() ?? "";
  if (!raw) return { descriptionLine: "" };
  const idx = raw.indexOf(" | ");
  if (idx < 0) return { descriptionLine: raw };
  const descriptionLine = raw.slice(0, idx).trim();
  const userNote = raw.slice(idx + 3).trim();
  return {
    descriptionLine,
    userNote: userNote || undefined,
  };
}

export function productNameFromDescription(description: string): string {
  const first = description.split(" • ")[0]?.trim();
  return first || description.trim();
}

/** Preenche nome do produto, unidade e regra a partir do catálogo + notas persistidas. */
export function enrichQuoteItems(
  items: QuoteItem[] | undefined,
  products: Product[],
): QuoteItem[] {
  if (!items?.length) return [];
  const byId = new Map(products.map((p) => [p.id, p]));

  return items.map((it) => {
    const product =
      it.product ?? (it.product_id ? byId.get(it.product_id) : undefined);
    const { descriptionLine, userNote } = splitStoredItemNote(it.note);

    const description =
      it.description?.trim() ||
      descriptionLine ||
      (product?.name ?? "");

    const pricing_rule =
      it.pricing_rule ??
      product?.pricing_rule ??
      (it.width_m != null &&
      it.height_m != null &&
      (it.width_m > 0 || it.height_m > 0)
        ? "por_area"
        : it.length_m != null && it.length_m > 0
          ? "por_linear"
          : "por_unidade");

    return {
      ...it,
      product,
      description,
      note: userNote,
      unit: it.unit ?? product?.unit,
      pricing_rule,
      charged_quantity: it.charged_quantity ?? it.quantity,
    };
  });
}

export function quoteItemTitle(it: QuoteItem): string {
  if (it.product?.name?.trim()) return it.product.name.trim();
  if (it.description?.trim()) {
    return productNameFromDescription(it.description);
  }
  const { descriptionLine } = splitStoredItemNote(it.note);
  if (descriptionLine) return productNameFromDescription(descriptionLine);
  return "Item";
}

export function quoteItemSpecLine(it: QuoteItem): string | undefined {
  const title = quoteItemTitle(it);
  const desc =
    it.description?.trim() ||
    splitStoredItemNote(it.note).descriptionLine;
  if (!desc || desc === title) return undefined;
  if (desc.startsWith(title)) {
    const rest = desc.slice(title.length).replace(/^\s*•\s*/, "").trim();
    return rest || undefined;
  }
  return desc;
}

export function quoteItemUserNote(it: QuoteItem): string | undefined {
  return it.note?.trim() || undefined;
}
