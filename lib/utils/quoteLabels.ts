/** Rótulos em PT-BR para exibição em listas e relatórios. */

const QUOTE_STATUS_PT: Record<string, string> = {
  pending: "Pendente",
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Rejeitado",
  cancelled: "Cancelado",
};

const WORK_STATUS_PT: Record<string, string> = {
  not_started: "Não iniciada",
  pending: "Aguardando início",
  scheduled: "Agendada",
  in_progress: "Em andamento",
  executing: "Em execução",
  completed: "Concluída",
  done: "Concluída",
  on_hold: "Pausada",
  paused: "Pausada",
  cancelled: "Cancelada",
};

export function quoteStatusLabelPt(status: string | undefined): string {
  if (!status?.trim()) return "—";
  const k = status.trim().toLowerCase();
  return QUOTE_STATUS_PT[k] ?? status;
}

export function workStatusLabelPt(status: string | undefined): string {
  if (!status?.trim()) return "—";
  const k = status.trim().toLowerCase().replace(/\s+/g, "_");
  return WORK_STATUS_PT[k] ?? status;
}
