"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, useAgent, type Agent } from "./api";
import { LlmStep } from "./llm-step";
import { PersonaStep } from "./persona-step";
import { TelegramStep } from "./telegram-step";

const STEPS = [
  { id: "llm", label: "Inteligência" },
  { id: "persona", label: "Personalidade" },
  { id: "telegram", label: "Telegram" },
] as const;

export function SetupWizard({ initial, userName }: { initial: Agent | null; userName: string }) {
  const router = useRouter();
  const { agent, refresh } = useAgent(initial);
  const started = useRef(false);
  const [retrying, setRetrying] = useState(false);

  // Primeira visita: dispara a criação do servidor do agente.
  useEffect(() => {
    if (!initial && !started.current) {
      started.current = true;
      void api("/api/agent", { method: "POST" }).then(refresh);
    }
  }, [initial, refresh]);

  useEffect(() => {
    if (agent?.setup_step === "done") router.replace("/app");
  }, [agent?.setup_step, router]);

  const current = agent?.setup_step ?? "llm";
  const idx = STEPS.findIndex((s) => s.id === current);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <ol className="mb-8 flex items-center gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                i < idx ? "bg-mint text-paper" : i === idx ? "bg-coral text-on-coral" : "bg-line text-ink-soft"
              }`}
            >
              {i < idx ? "✓" : i + 1}
            </span>
            <span className={`hidden sm:inline ${i === idx ? "font-semibold" : "text-ink-soft"}`}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      <div className="card p-6 sm:p-9">
        {!agent || agent.status === "provisioning" ? (
          <Provisioning detail={agent?.status_detail} />
        ) : agent.status === "error" ? (
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-bold">Não conseguimos criar seu agente 😕</h2>
            <p className="text-ink-soft">Isso costuma ser passageiro. Detalhe técnico:</p>
            <pre className="overflow-x-auto rounded-xl bg-cream p-3 text-xs">{agent.status_detail}</pre>
            <button
              className="btn-primary"
              disabled={retrying}
              onClick={async () => {
                setRetrying(true);
                await api("/api/agent", { method: "POST" }).catch(() => null);
                await refresh();
                setRetrying(false);
              }}
            >
              Tentar de novo
            </button>
          </div>
        ) : current === "llm" ? (
          <LlmStep onDone={refresh} />
        ) : current === "persona" ? (
          <PersonaStep agent={agent} ownerName={userName} onDone={refresh} />
        ) : current === "telegram" ? (
          <TelegramStep agent={agent} onDone={refresh} onBotSaved={refresh} />
        ) : (
          <p>Tudo pronto! Redirecionando…</p>
        )}
      </div>
    </div>
  );
}

const TIPS = [
  "Estamos criando um servidor dedicado só para você.",
  "Sua assistente terá memória e credenciais isoladas de qualquer outro cliente.",
  "Enquanto isso: tenha à mão sua conta do ChatGPT ou do Claude — vamos usar no próximo passo.",
];

function Provisioning({ detail }: { detail?: string | null }) {
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTip((x) => (x + 1) % TIPS.length), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <div className="relative grid h-20 w-20 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-coral/30" />
        <span className="relative grid h-16 w-16 place-items-center rounded-full bg-coral text-3xl">🦞</span>
      </div>
      <h2 className="mt-6 font-display text-2xl font-bold">{detail ?? "Preparando tudo…"}</h2>
      <p className="mt-2 max-w-md text-ink-soft">{TIPS[tip]}</p>
      <p className="mt-6 text-xs text-ink-soft">Isso leva menos de um minuto.</p>
    </div>
  );
}
