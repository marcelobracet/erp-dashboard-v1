"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Input from "@/components/ui/Input";
import type { Client } from "@/lib/api/services";

export const CLIENT_PICKER_ADD_NEW = "__add_new__";

function formatClientAddress(c: Client): string {
  const parts = [
    c.address?.trim(),
    c.city?.trim(),
    c.state?.trim(),
    c.zip_code?.trim(),
  ].filter(Boolean);
  return parts.join(", ");
}

export function clientToQuoteDraft(c: Client): {
  name: string;
  phone: string;
  email: string;
  address: string;
} {
  return {
    name: c.name?.trim() ?? "",
    phone: c.phone?.trim() ?? "",
    email: c.email?.trim() ?? "",
    address: formatClientAddress(c),
  };
}

interface ClientPickerProps {
  clients: Client[];
  loading?: boolean;
  selectedClientId: string | null;
  onSelectClient: (client: Client) => void;
  onAddNew: () => void;
  disabled?: boolean;
}

export default function ClientPicker({
  clients,
  loading = false,
  selectedClientId,
  onSelectClient,
  onAddNew,
  disabled = false,
}: ClientPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const hay = [c.name, c.email, c.phone, c.document]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [clients, query]);

  const updatePanelPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setPanelStyle({
      position: "fixed",
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
      zIndex: 200,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onReposition = () => updatePanelPosition();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  const dropdown =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className="rounded-xl border border-glass-10 bg-background shadow-2xl overflow-hidden"
          >
            <div className="p-2 border-b border-glass-10">
              <Input
                placeholder="Buscar por nome, e-mail ou telefone…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-sm text-text-60">
                  Nenhum cliente encontrado.
                </li>
              ) : (
                filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`w-full text-left px-4 py-3 hover:bg-glass-10 transition-colors ${
                        c.id === selectedClientId ? "bg-accent/10" : ""
                      }`}
                      onClick={() => {
                        onSelectClient(c);
                        setQuery("");
                        setOpen(false);
                      }}
                    >
                      <div className="font-medium text-foreground">
                        {c.name}
                      </div>
                      {(c.email || c.phone) && (
                        <div className="text-xs text-text-60 mt-0.5">
                          {[c.phone, c.email].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </button>
                  </li>
                ))
              )}
              <li className="border-t border-glass-10 mt-1">
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm font-medium text-accent hover:bg-glass-10"
                  onClick={() => {
                    onAddNew();
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  + Cadastrar novo cliente na base
                </button>
              </li>
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-text-80 mb-2">
        Cliente cadastrado
      </label>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-glass-10 bg-glass-5 text-left text-foreground hover:border-glass-20 focus:outline-none focus:ring-2 focus:ring-accent-20 disabled:opacity-50"
      >
        <span className={selected ? "text-foreground" : "text-text-60"}>
          {loading
            ? "Carregando clientes…"
            : selected
              ? selected.name
              : "Buscar cliente cadastrado…"}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 text-text-60 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {dropdown}
    </div>
  );
}
