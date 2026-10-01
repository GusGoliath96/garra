"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, useAgent, type Agent, type Health } from "../setup/api";
import { LlmStep } from "../setup/llm-step";
import { PersonaStep } from "../setup/persona-step";
import { TelegramStep } from "../setup/telegram-step";

const PROVIDER_LABEL: Record<string, string> = { openai: "ChatGPT (OpenAI)", anthropic: "Claude (Anthropic)", openrouter: "OpenRouter" };

type Panel = "llm" | "persona" | "telegram" | null;

export function Dashboard({ initial, userName }: { initial: Agent; userName: string }) {
  const router = useRouter();
  const { agent, health, refresh } = useAgent(initial);
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const a = agent ?? initial;

  const close = async () => {
    setPanel(null);
    await refresh();
  };

  async function restart() {
    setBusy("restart");
    await api("/api/agent/restart", { method: "POST" }).catch((e) => alert(e.message));
    await refresh();
    setBusy(null);
  }

  async function remove() {
    if (!confirm(`Apagar ${a.name ?? "sua assistente"} e toda a memória dela? Isso não pode ser desfeito.`)) return;
    setBusy("delete");
    try {
      await api("/api/agent", { method: "DELETE" });
      router.push("/app/setup");
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
      {/* Cabeçalho */}
      <section className="card flex flex-wrap items-center justify-between gap-6 p-7">
        <div className="flex items-center gap-5">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-coral-soft text-4xl">{a.emoji ?? "🦞"}</span>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{a.name ?? "Sua assistente"}</h1>
            <StatusPill health={health} status={a.status} />
          </div>
        </div>
        {a.telegram_bot && (
          <a href={`https://t.me/${a.telegram_bot}`} target="_blank" rel="noreferrer" className="btn-primary">
            Conversar no Telegram ↗
          </a>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <Tile
          title="Inteligência"
          value={a.llm_provider ? PROVIDER_LABEL[a.llm_provider] ?? a.llm_provider : "Não configurada"}
          detail={a.llm_provider ? `${a.llm_mode === "subscription" ? "Assinatura" : "Chave de API"} · ${a.llm_model ?? ""}` : undefined}
          action="Trocar"
          onAction={() => setPanel(panel === "llm" ? null : "llm")}
          active={panel === "llm"}
        />
        <Tile
          title="Personalidade"
          value={toneLabel(a.persona?.tone)}
          detail={a.persona?.timezone}
          action="Editar"
          onAction={() => setPanel(panel === "persona" ? null : "persona")}
          active={panel === "persona"}
        />
        <Tile
          title="Telegram"
          value={a.telegram_bot ? `@${a.telegram_bot}` : "Não conectado"}
          detail={a.telegram_bot ? "Novos contatos precisam da sua aprovação" : "Conecte para conversar"}
          action={a.telegram_bot ? "Gerenciar" : "Conectar"}
          onAction={() => setPanel(panel === "telegram" ? null : "telegram")}
          active={panel === "telegram"}
        />
      </div>

      {panel && (
        <section className="card p-6 sm:p-9">
          {panel === "llm" && <LlmStep onDone={close} />}
          {panel === "persona" && <PersonaStep agent={a} ownerName={userName} onDone={close} submitLabel="Salvar" />}
          {panel === "telegram" && <TelegramStep agent={a} onDone={close} onBotSaved={refresh} />}
        </section>
      )}

      <section className="card">
        <h2 className="font-display text-xl font-bold">Integrações</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Integration icon="📅" name="Google Agenda" text="Consultar e marcar compromissos por mensagem." />
          <Integration icon="✉️" name="Gmail" text="Resumir e responder e-mails importantes." />
        </div>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">Manutenção</h2>
          <p className="text-sm text-ink-soft">Se ela parar de responder, reiniciar costuma resolver.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={restart} disabled={busy !== null}>
            {busy === "restart" ? "Reiniciando…" : "Reiniciar"}
          </button>
          <button className="btn-ghost border-coral/40 text-coral-deep hover:border-coral-deep" onClick={remove} disabled={busy !== null}>
            {busy === "delete" ? "Apagando…" : "Apagar assistente"}
          </button>
        </div>
      </section>
    </div>
  );
}

function toneLabel(t?: string) {
  return { amigavel: "Amigável", profissional: "Profissional", divertido: "Divertida", direto: "Direta" }[t ?? ""] ?? "Padrão";
}

function StatusPill({ health, status }: { health: Health; status: Agent["status"] }) {
  const online = status === "ready" && health?.container === "running" && health.gateway?.ok;
  const checking = status === "ready" && !health;
  return (
    <span
      className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        online ? "bg-mint/10 text-mint" : checking ? "bg-line text-ink-soft" : "bg-coral-soft text-coral-deep"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-mint" : checking ? "bg-ink-soft" : "bg-coral"}`} />
      {online ? "Online" : checking ? "Verificando…" : "Fora do ar"}
    </span>
  );
}

function Tile(props: { title: string; value: string; detail?: string; action: string; onAction: () => void; active: boolean }) {
  return (
    <div className={`card flex flex-col justify-between gap-4 ${props.active ? "border-coral" : ""}`}>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{props.title}</div>
        <div className="mt-2 text-lg font-semibold">{props.value}</div>
        {props.detail && <div className="mt-0.5 truncate text-sm text-ink-soft">{props.detail}</div>}
      </div>
      <button className="btn-ghost self-start py-2" onClick={props.onAction}>
        {props.active ? "Fechar" : props.action}
      </button>
    </div>
  );
}

function Integration({ icon, name, text }: { icon: string; name: string; text: string }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-dashed border-line p-4">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2 font-semibold">
          {name}
          <span className="rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-semibold text-coral-deep">em breve</span>
        </div>
        <p className="text-sm text-ink-soft">{text}</p>
      </div>
    </div>
  );
}
