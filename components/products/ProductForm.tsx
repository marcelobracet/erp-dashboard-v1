'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ImageUploadField from '@/components/ui/ImageUploadField';
import type { Product } from '@/lib/api/services';
import { productService } from '@/lib/api/services';

type ProductCategory = NonNullable<Product['category']>;
type SaleUnit = NonNullable<Product['unit']>;
type PricingRule = NonNullable<Product['pricing_rule']>;

type Draft = {
  name: string;
  sku: string;
  description: string;

  category: ProductCategory;
  unit: SaleUnit;
  pricing_rule: PricingRule;

  price: string;
  stock: string;

  thickness_mm: string;
  finish: string;
  line: string;

  waste_percent: string;
  minimum_charge: string;

  active: boolean;
};

function toNumberOrUndefined(value: string): number | undefined {
  const v = value.trim();
  if (!v) return undefined;

  // Accept "3.285,11" or "3285,11" or "3285.11"
  const normalized = v.replaceAll('.', '').replace(',', '.');
  const n = Number(normalized);
  if (Number.isNaN(n)) return undefined;
  return n;
}

function toIntOrUndefined(value: string): number | undefined {
  const n = toNumberOrUndefined(value);
  if (n == null) return undefined;
  return Math.trunc(n);
}

function initialDraft(product?: Product | null): Draft {
  return {
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    description: product?.description ?? '',

    category: product?.category ?? 'material',
    unit: product?.unit ?? 'm2',
    pricing_rule: product?.pricing_rule ?? 'por_area',

    price: product?.price != null ? String(product.price) : '',
    stock: product?.stock != null ? String(product.stock) : '',

    thickness_mm: product?.thickness_mm != null ? String(product.thickness_mm) : '',
    finish: product?.finish ?? '',
    line: product?.line ?? '',

    waste_percent: product?.waste_percent != null ? String(product.waste_percent) : '10',
    minimum_charge: product?.minimum_charge != null ? String(product.minimum_charge) : '',

    active: product?.active ?? true,
  };
}

export default function ProductForm({
  product,
  onCancel,
  onSaved,
}: {
  product?: Product | null;
  onCancel: () => void;
  onSaved: (p: Product) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft(product));
  const [imageUrl, setImageUrl] = useState(() => product?.image_url ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = draft.name.trim();
    if (!name) {
      setError('Informe o nome do produto.');
      return;
    }

    const sku = draft.sku.trim();
    if (!sku) {
      setError('Informe o SKU / código interno.');
      return;
    }

    const price = toNumberOrUndefined(draft.price);
    if (price == null) {
      setError('Informe um preço válido.');
      return;
    }

    const stock = toIntOrUndefined(draft.stock) ?? 0;

    setIsSaving(true);
    try {

      const payload: Partial<Product> = {
        name,
        description: draft.description.trim() || undefined,
        price,
        stock,
        sku,
        category: draft.category,
        image_url: imageUrl.trim() || undefined,
        active: draft.active,
        unit: draft.unit,
        pricing_rule: draft.pricing_rule,
        thickness_mm: toNumberOrUndefined(draft.thickness_mm),
        finish: draft.finish.trim() || undefined,
        line: draft.line.trim() || undefined,
        waste_percent: toNumberOrUndefined(draft.waste_percent),
        minimum_charge: toNumberOrUndefined(draft.minimum_charge),
      };

      const saved = product?.id
        ? await productService.update(product.id, payload)
        : await productService.create(payload);

      onSaved(saved);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar produto';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Input
        label="Nome do produto"
        placeholder="Ex.: Granito Preto São Gabriel - Polido 2cm"
        value={draft.name}
        onChange={(e) => update('name', e.target.value)}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-80 mb-2">Categoria</label>
          <select
            value={draft.category}
            onChange={(e) => update('category', e.target.value as ProductCategory)}
            className="w-full px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-20 focus:border-accent-hover"
          >
            <option value="material">Material</option>
            <option value="service">Serviço</option>
            <option value="accessory">Acessório</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-80 mb-2">Unidade</label>
          <select
            value={draft.unit}
            onChange={(e) => update('unit', e.target.value as SaleUnit)}
            className="w-full px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-20 focus:border-accent-hover"
          >
            <option value="m2">m²</option>
            <option value="m">metro linear</option>
            <option value="un">unidade</option>
            <option value="kit">kit</option>
            <option value="chapa">chapa</option>
            <option value="hora">hora</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-80 mb-2">Regra de cálculo</label>
          <select
            value={draft.pricing_rule}
            onChange={(e) => update('pricing_rule', e.target.value as PricingRule)}
            className="w-full px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground focus:outline-none focus:ring-2 focus:ring-accent-20 focus:border-accent-hover"
          >
            <option value="por_area">por área (L × A)</option>
            <option value="por_linear">por metro linear</option>
            <option value="por_unidade">por unidade</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Preço (R$)"
          placeholder="Ex.: 3285,11"
          value={draft.price}
          onChange={(e) => update('price', e.target.value)}
        />
        <Input
          label="Estoque"
          type="number"
          placeholder="Ex.: 10 (0 se vazio)"
          value={draft.stock}
          onChange={(e) => update('stock', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Espessura (mm)"
          placeholder="Ex.: 20"
          value={draft.thickness_mm}
          onChange={(e) => update('thickness_mm', e.target.value)}
        />
        <Input
          label="Acabamento"
          placeholder="Ex.: Polido"
          value={draft.finish}
          onChange={(e) => update('finish', e.target.value)}
        />
        <Input
          label="Linha"
          placeholder="Ex.: L. GOLD"
          value={draft.line}
          onChange={(e) => update('line', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Perda / sobra (%)"
          placeholder="Ex.: 10"
          value={draft.waste_percent}
          onChange={(e) => update('waste_percent', e.target.value)}
        />
        <Input
          label="Mínimo cobravel"
          placeholder="Ex.: 0,50"
          value={draft.minimum_charge}
          onChange={(e) => update('minimum_charge', e.target.value)}
        />
      </div>

      <Input
        label="SKU / Código interno"
        placeholder="Ex.: GRA-PSG-20-POL"
        value={draft.sku}
        onChange={(e) => update('sku', e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-text-80 mb-2">Imagem do produto</label>
        <ImageUploadField
          purpose="product"
          preview="product"
          value={imageUrl}
          onChange={setImageUrl}
          uploadLabel="Enviar foto do produto"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-80 mb-2">Descrição (para o orçamento)</label>
        <textarea
          value={draft.description}
          onChange={(e) => update('description', e.target.value)}
          className="w-full min-h-24 px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-foreground placeholder:text-text-60 focus:outline-none focus:ring-2 focus:ring-accent-20 focus:border-accent-hover"
          placeholder="Ex.: Incolor 08mm - Temperado | Cor perfil: Preto | Cor acessório: Preto"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-text-80">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => update('active', e.target.checked)}
          className="rounded border-glass-10 bg-glass-5"
        />
        Produto ativo
      </label>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSaving}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
