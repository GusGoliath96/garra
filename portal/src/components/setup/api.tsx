"use client";

import { useCallback, useEffect, useState } from "react";

export type Agent = {
  id: string;
  tenant: string;
  status: "provisioning" | "ready" | "error" | "stopped" | "deleting";
  status_detail: string | null;
  setup_step: "llm" | "persona" | "telegram" | "done";
  llm_provider: string | null;
  llm_mode: "api_key" | "subscription" | null;
  llm_model: string | null;
  name: string | null;
  emoji: string | null;
  persona: {
    ownerName?: string;
    tone?: string;
    language?: string;
    timezone?: string;
    instructions?: string;
  };
  telegram_bot: string | null;
  created_at: string;
};

export type Health = {
  container: "running" | "stopped" | "missing";
  gateway: { ok: boolean; error?: string } | null;
  channels?: Record<string, unknown> | null;
} | null;

export async function api<T = { ok: boolean }>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(path, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);
  return data as T;
}

/** Estado do agente com polling (mais rápido enquanto está provisionando). */
export function useAgent(initial: Agent | null) {
  const [agent, setAgent] = useState<Agent | null>(initial);
  const [health, setHealth] = useState<Health>(null);

  const refresh = useCallback(async () => {
    const data = await api<{ agent: Agent | null; health: Health }>("/api/agent");
    setAgent(data.agent);
    setHealth(data.health);
    return data.agent;
  }, []);

  const busy = !agent || agent.status === "provisioning";
  useEffect(() => {
    const load = () => void refresh().catch(() => null);
    const first = setTimeout(load, 0);
    const t = setInterval(load, busy ? 2000 : 10000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [busy, refresh]);

  return { agent, health, refresh, setAgent };
}

export function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="rounded-xl bg-coral-soft px-4 py-3 text-sm text-coral-deep">{error}</p>;
}
