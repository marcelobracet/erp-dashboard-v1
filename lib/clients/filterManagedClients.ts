import type { Client } from "@/lib/api/services";

/** Clientes criados automaticamente no fluxo de orçamento avulso (documento ORC…). */
export function isAutoQuoteInquiryClient(client: Client): boolean {
  const doc = client.document?.trim().toUpperCase() ?? "";
  return doc.startsWith("ORC");
}

/** Evita listar o próprio usuário logado como cliente gerenciável. */
export function isCurrentUserClient(
  client: Client,
  userEmail?: string | null,
): boolean {
  const email = userEmail?.trim().toLowerCase();
  const clientEmail = client.email?.trim().toLowerCase();
  if (!email || !clientEmail) return false;
  return clientEmail === email;
}

/** Clientes exibidos na tela de gestão e no seletor de orçamentos. */
export function filterClientsForManagement(
  clients: Client[],
  userEmail?: string | null,
): Client[] {
  return clients.filter(
    (c) =>
      !isAutoQuoteInquiryClient(c) && !isCurrentUserClient(c, userEmail),
  );
}
