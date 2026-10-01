"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../setup/api";

type Integration = { provider: string; account_email: string | null; status: "active" | "error"; status_detail: string | null };

const REASONS: Record<string, string> = {
  config: "A integração com o Google ainda não foi configurada no servidor.",
  agente: "Sua assistente precisa estar pronta antes de conectar a agenda.",
  state: "O retorno do Google expirou ou não confere. Tente conectar de novo.",
};

/** Card do Google Agenda no painel: conectar, ver conta conectada, reconectar ou desconectar. */
export function GoogleCalendarCard() {
  const [data, setData] = useState<{ available: boolean; integ: Integration | null } | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await api<{ integrations: Integration[]; google: { available: boolean } }>("/api/integrations").catch(() => null);
    if (r) setData({ available: r.google.available, integ: r.integrations.find((i) => i.provider === "google") ?? null });
  }, []);

  useEffect(() => {
    // Aviso vindo do retorno do OAuth (?google=ok|erro|cancelado), depois limpa a URL.
    const p = new URLSearchParams(window.location.search);
    const g = p.get("google");
    const t = setTimeout(() => {
      if (g === "ok") setNotice({ ok: true, text: "Google Agenda conectado! Experimente: “o que tenho amanhã?”" });
      else if (g === "cancelado") setNotice({ ok: false, text: "Conexão cancelada no Google." });
      else if (g === "erro") setNotice({ ok: false, text: REASONS[p.get("motivo") ?? ""] ?? p.get("motivo") ?? "Não foi possível conectar." });
      void load();
    }, 0);
    if (g) window.history.replaceState(null, "", window.location.pathname);
    return () => clearTimeout(t);
  }, [load]);

  async function disconnect() {
    if (!confirm("Desconectar o Google Agenda? A assistente deixa de ver e alterar sua agenda.")) return;
    setBusy(true);
    await api("/api/integrations?provider=google", { method: "DELETE" }).catch((e) => alert(e.message));
    await load();
    setBusy(false);
  }

  const integ = data?.integ;
  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:col-span-2 ${integ ? "border-line bg-cream" : "border-dashed border-line"}`}>
      <div className="flex items-start gap-4">
        <span className="text-2xl">📅</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 font-semibold">
            Google Agenda
            {integ?.status === "active" && (
              <span className="rounded-full bg-mint-soft px-2 py-0.5 text-[11px] font-semibold text-mint">conectado</span>
            )}
            {integ?.status === "error" && (
              <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-semibold text-coral-deep">reconectar</span>
            )}
            {data && !data.available && !integ && (
              <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-semibold text-coral-deep">em breve</span>
            )}
          </div>
          <p className="text-sm text-ink-soft">
            {integ?.status === "active"
              ? `Conectado como ${integ.account_email ?? "sua conta Google"}. Ela pode consultar, marcar, remarcar e achar horários livres.`
              : integ?.status === "error"
                ? integ.status_detail
                : "Consultar, marcar e remarcar compromissos por mensagem, e encontrar horários livres."}
          </p>
        </div>
      </div>
      {notice && (
        <p className={`rounded-xl px-3 py-2 text-sm ${notice.ok ? "bg-mint-soft text-mint" : "bg-coral-soft text-coral-deep"}`}>{notice.text}</p>
      )}
      {data?.available && (
        <div className="flex flex-wrap gap-2">
          {(!integ || integ.status === "error") && (
            <a href="/api/integrations/google/start" className="btn-primary py-2">
              {integ ? "Reconectar Google" : "Conectar Google Agenda"}
            </a>
          )}
          {integ && (
            <button className="btn-ghost py-2" onClick={disconnect} disabled={busy}>
              {busy ? "Desconectando…" : "Desconectar"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
