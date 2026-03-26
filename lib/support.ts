/**
 * Link do WhatsApp de suporte.
 * Preferir `NEXT_PUBLIC_SUPPORT_WHATSAPP_URL` (URL completa) ou
 * `NEXT_PUBLIC_SUPPORT_WHATSAPP_PHONE` (só dígitos, ex.: 5511987654321).
 */
export function getSupportWhatsAppHref(): string {
  const url = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_URL?.trim();
  if (url) return url;

  const phone =
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_PHONE?.replace(/\D/g, "") ?? "";
  const text = encodeURIComponent(
    process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_MESSAGE?.trim() ||
      "Olá! Preciso de suporte."
  );

  if (phone) {
    return `https://wa.me/${phone}?text=${text}`;
  }

  return `https://wa.me/?text=${text}`;
}
