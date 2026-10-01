"use client";

import { useEffect, useState } from "react";
import { api, ErrorBox } from "./api";

type Provider = "openai" | "anthropic" | "openrouter";
type Mode = "subscription" | "api_key";

const OPTIONS: {
  id: Provider;
  label: string;
  sub: string;
  logo: string;
  modes: Mode[];
  keyPlaceholder: string;
  keyUrl: string;
}[] = [
  {
    id: "openai",
    label: "ChatGPT",
    sub: "OpenAI",
    logo: "◎",
    modes: ["subscription", "api_key"],
    keyPlaceholder: "sk-proj-…",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    label: "Claude",
    sub: "Anthropic",
    logo: "✳",
    modes: ["subscription", "api_key"],
    keyPlaceholder: "sk-ant-api03-…",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    sub: "vários modelos",
    logo: "⇄",
    modes: ["api_key"],
    keyPlaceholder: "sk-or-v1-…",
    keyUrl: "https://openrouter.ai/settings/keys",
  },
];

type OAuth = {
  status: "starting" | "waiting_user" | "waiting_code" | "finishing" | "done" | "error";
  url?: string;
  code?: string;
  error?: string;
} | null;

export function LlmStep({ onDone }: { onDone: () => void }) {
  const [provider, setProvider] = useState<Provider>("openai");
  const [mode, setMode] = useState<Mode>("subscription");
  const opt = OPTIONS.find((o) => o.id === provider)!;

  function pick(p: Provider) {
    setProvider(p);
    const o = OPTIONS.find((x) => x.id === p)!;
    if (!o.modes.includes(mode)) setMode(o.modes[0]);
  }

  return (
    <div className="space-y-7">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight">Qual IA vai ser o cérebro?</h2>
        <p className="mt-1.5 text-ink-soft">Você pode trocar depois, no painel.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => pick(o.id)}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              provider === o.id ? "border-coral bg-coral-soft/40" : "border-line bg-paper hover:border-ink/30"
            }`}
          >
            <div className="text-2xl">{o.logo}</div>
            <div className="mt-2 font-semibold">{o.label}</div>
            <div className="text-xs text-ink-soft">{o.sub}</div>
          </button>
        ))}
      </div>

      {opt.modes.length > 1 && (
        <div className="inline-flex rounded-full border border-line bg-paper p-1">
          {opt.modes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === m ? "bg-ink text-cream" : "text-ink-soft hover:text-ink"
              }`}
            >
              {m === "subscription" ? "Usar minha assinatura" : "Usar chave de API"}
            </button>
          ))}
        </div>
      )}

      {mode === "subscription" && provider === "openai" && <ChatGptLogin onDone={onDone} />}
      {mode === "subscription" && provider === "anthropic" && <ClaudeLogin onDone={onDone} />}
      {mode === "api_key" && <ApiKeyForm key={provider} provider={provider} opt={opt} onDone={onDone} />}

      {mode === "subscription" && (
        <p className="text-xs leading-relaxed text-ink-soft">
          Ao usar sua assinatura pessoal, o uso conta nos limites do seu plano. Os termos de uso de cada provedor podem
          restringir o uso de assinaturas em serviços de terceiros; se preferir, use uma chave de API.
        </p>
      )}
    </div>
  );
}

function ApiKeyForm({ provider, opt, onDone }: { provider: Provider; opt: (typeof OPTIONS)[number]; onDone: () => void }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/agent/llm", { body: { provider, mode: "api_key", secret } });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="key">Chave de API do {opt.label}</label>
        <input
          id="key"
          className="input font-mono"
          type="password"
          placeholder={opt.keyPlaceholder}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoComplete="off"
          required
        />
        <p className="mt-1.5 text-xs text-ink-soft">
          Gere uma em{" "}
          <a href={opt.keyUrl} target="_blank" rel="noreferrer" className="font-semibold text-coral-deep underline">
            {new URL(opt.keyUrl).hostname}
          </a>
          . A chave fica guardada só no servidor do seu agente.
        </p>
      </div>
      <ErrorBox error={error} />
      <button className="btn-primary" disabled={loading || !secret}>
        {loading ? "Testando a chave…" : "Conectar"}
      </button>
    </form>
  );
}

function ChatGptLogin({ onDone }: { onDone: () => void }) {
  const [oauth, setOauth] = useState<OAuth>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function start() {
    setError(null);
    setLoading(true);
    try {
      const r = await api<{ oauth: OAuth }>("/api/agent/llm/oauth", { body: { provider: "openai" } });
      setOauth(r.oauth);
      if (r.oauth?.status === "error") setError(r.oauth.error ?? "Falha ao iniciar o login.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Espera o usuário concluir o login na página da OpenAI.
  useEffect(() => {
    if (!oauth || oauth.status === "done" || oauth.status === "error") return;
    const t = setInterval(async () => {
      const r = await api<{ oauth: OAuth }>("/api/agent/llm/oauth").catch(() => null);
      if (!r?.oauth) return;
      setOauth(r.oauth);
      if (r.oauth.status === "done") onDone();
      if (r.oauth.status === "error") setError(r.oauth.error ?? "O login falhou.");
    }, 2000);
    return () => clearInterval(t);
  }, [oauth, onDone]);

  if (!oauth || oauth.status === "error" || oauth.status === "starting") {
    return (
      <div className="space-y-4">
        <p className="text-ink-soft">
          Vamos abrir a página de login da OpenAI. Você entra com a conta do seu ChatGPT Plus/Pro e digita um código que
          vamos te mostrar aqui.
        </p>
        <ErrorBox error={error} />
        <button type="button" className="btn-primary" onClick={start} disabled={loading || oauth?.status === "starting"}>
          {loading || oauth?.status === "starting" ? "Gerando código…" : "Entrar com o ChatGPT"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-3xl border border-line bg-cream p-6">
      <ol className="space-y-4 text-[15px]">
        <li>
          <b>1.</b> Copie este código:
          <div className="mt-2 flex items-center gap-3">
            <code className="rounded-2xl border-2 border-dashed border-coral bg-paper px-5 py-3 font-mono text-3xl font-bold tracking-[0.2em]">
              {oauth.code}
            </code>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                void navigator.clipboard.writeText(oauth.code ?? "");
                setCopied(true);
              }}
            >
              {copied ? "Copiado ✓" : "Copiar"}
            </button>
          </div>
        </li>
        <li>
          <b>2.</b>{" "}
          <a href={oauth.url} target="_blank" rel="noreferrer" className="btn-dark ml-1">
            Abrir página da OpenAI ↗
          </a>
          <p className="mt-2 text-sm text-ink-soft">Entre com sua conta do ChatGPT e cole o código quando pedir.</p>
        </li>
        <li className="flex items-center gap-3 text-ink-soft">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-coral border-t-transparent" />
          {oauth.status === "done" ? "Conectado!" : "Esperando você concluir o login…"}
        </li>
      </ol>
      <ErrorBox error={error} />
    </div>
  );
}

function ClaudeLogin({ onDone }: { onDone: () => void }) {
  const [oauth, setOauth] = useState<OAuth>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function start() {
    setError(null);
    setCode("");
    setLoading(true);
    try {
      const r = await api<{ oauth: OAuth }>("/api/agent/llm/oauth", { body: { provider: "anthropic" } });
      setOauth(r.oauth);
      if (r.oauth?.status === "error") setError(r.oauth.error ?? "Falha ao iniciar o login.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await api<{ oauth: OAuth }>("/api/agent/llm/oauth", { body: { provider: "anthropic", code } });
      setOauth(r.oauth);
      if (r.oauth?.status === "done") onDone();
      else setError(r.oauth?.error ?? "Não deu certo. Tente de novo.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!oauth || oauth.status === "error" || oauth.status === "done") {
    return (
      <div className="space-y-4">
        <p className="text-ink-soft">
          Vamos abrir a página do Claude para você entrar com a sua conta Pro/Max e autorizar. No fim, ela mostra um
          código — é só colar aqui.
        </p>
        <ErrorBox error={error} />
        <button type="button" className="btn-primary" onClick={start} disabled={loading}>
          {loading ? "Preparando…" : "Entrar com o Claude"}
        </button>
        <ManualClaudeToken onDone={onDone} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-3xl border border-line bg-cream p-6">
      <ol className="space-y-4 text-[15px]">
        <li>
          <b>1.</b>{" "}
          <a href={oauth.url} target="_blank" rel="noreferrer" className="btn-dark ml-1">
            Abrir página do Claude ↗
          </a>
          <p className="mt-2 text-sm text-ink-soft">Entre com sua conta e clique em “Autorizar”.</p>
        </li>
        <li>
          <b>2.</b> Copie o código que aparece depois de autorizar e cole aqui:
          <input
            className="input mt-2 font-mono"
            placeholder="Cole o código de autorização"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            required
          />
        </li>
      </ol>
      <ErrorBox error={error} />
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={loading || !code}>
          {loading ? "Conectando…" : "Conectar Claude"}
        </button>
        <button type="button" className="text-sm text-ink-soft underline hover:text-ink" onClick={start} disabled={loading}>
          Gerar novo link
        </button>
      </div>
    </form>
  );
}

/** Opção avançada: quem já tem um token de `claude setup-token`. */
function ManualClaudeToken({ onDone }: { onDone: () => void }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/agent/llm", { body: { provider: "anthropic", mode: "subscription", secret } });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="text-sm text-ink-soft">
      <summary className="cursor-pointer">Já tenho um token do Claude Code</summary>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <p>
          Se você usa o Claude Code, rode <code className="kbd">claude setup-token</code> e cole o token (
          <code className="kbd">sk-ant-oat…</code>).
        </p>
        <input
          className="input font-mono"
          type="password"
          placeholder="sk-ant-oat01-…"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoComplete="off"
          required
        />
        <ErrorBox error={error} />
        <button className="btn-ghost" disabled={loading || !secret}>
          {loading ? "Conectando…" : "Usar este token"}
        </button>
      </form>
    </details>
  );
}
