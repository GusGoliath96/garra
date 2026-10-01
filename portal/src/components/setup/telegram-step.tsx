"use client";

import { useEffect, useState } from "react";
import { api, ErrorBox, type Agent } from "./api";

type Request = { code: string; label: string };

export function TelegramStep({ agent, onDone, onBotSaved }: { agent: Agent; onDone: () => void; onBotSaved: () => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(!agent.telegram_bot);

  async function saveToken(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/agent/telegram", { body: { token } });
      setToken("");
      setEditing(false);
      onBotSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function skip() {
    await api("/api/agent/telegram", { body: { skip: true } }).catch(() => null);
    onDone();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight">Agora, o Telegram</h2>
        <p className="mt-1.5 text-ink-soft">
          Sua assistente vai conversar com você por um bot do Telegram que é só seu. Leva uns 2 minutos.
        </p>
      </div>

      {editing ? (
        <form onSubmit={saveToken} className="space-y-6">
          <ol className="space-y-3">
            <Step n={1}>
              No Telegram, abra o{" "}
              <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="font-semibold text-coral-deep underline">
                @BotFather
              </a>{" "}
              (o robô oficial do Telegram para criar bots — tem um selo azul ✔).
            </Step>
            <Step n={2}>
              Envie <code className="kbd">/newbot</code>.
            </Step>
            <Step n={3}>
              Ele pede um <b>nome</b>: é o que aparece nas conversas. Ex.: <i>{agent.name ?? "Lia"}</i>.
            </Step>
            <Step n={4}>
              Depois pede um <b>username</b>, que precisa terminar com <code className="kbd">bot</code>. Ex.:{" "}
              <code className="kbd">{(agent.name ?? "lia").toLowerCase().replace(/[^a-z0-9]/g, "")}_assistente_bot</code>.
            </Step>
            <Step n={5}>
              Ele responde com um <b>token</b> parecido com <code className="kbd">123456789:AAH4k…</code>. Copie e cole
              aqui embaixo.
            </Step>
          </ol>

          <div>
            <label className="label" htmlFor="tg">Token do bot</label>
            <input
              id="tg"
              className="input font-mono"
              placeholder="123456789:AAH…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
              required
            />
            <p className="mt-1.5 text-xs text-ink-soft">Não compartilhe esse token com ninguém: quem tem ele controla o bot.</p>
          </div>
          <ErrorBox error={error} />
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" disabled={loading || !token}>
              {loading ? "Verificando…" : "Conectar bot"}
            </button>
            <button type="button" className="text-sm text-ink-soft underline hover:text-ink" onClick={skip}>
              Fazer isso depois
            </button>
          </div>
        </form>
      ) : (
        <Pairing agent={agent} onDone={onDone} onChangeBot={() => setEditing(true)} />
      )}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-4 rounded-2xl border border-line bg-paper p-4">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-cream">{n}</span>
      <div className="leading-relaxed">{children}</div>
    </li>
  );
}

function Pairing({ agent, onDone, onChangeBot }: { agent: Agent; onDone: () => void; onChangeBot: () => void }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const bot = agent.telegram_bot;

  // Procura quem mandou /start pro bot.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const r = await api<{ requests: Request[] }>("/api/agent/telegram/pairing").catch(() => null);
      if (alive && r) setRequests(r.requests);
    };
    void load();
    const t = setInterval(load, 6000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  async function approve(code: string) {
    setError(null);
    setApproving(code);
    try {
      await api("/api/agent/telegram/pairing", { body: { code } });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setApproving(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-line bg-cream p-6">
        <p className="text-sm font-semibold text-mint">✓ Bot @{bot} conectado</p>
        <p className="mt-3 text-[15px] leading-relaxed">
          Agora abra o seu bot e mande <code className="kbd">/start</code>. Por segurança ele vai responder com um código
          de pareamento — e o seu pedido aparece aqui pra você aprovar.
        </p>
        <a href={`https://t.me/${bot}`} target="_blank" rel="noreferrer" className="btn-dark mt-4">
          Abrir @{bot} no Telegram ↗
        </a>
      </div>

      {requests.length === 0 ? (
        <div className="flex items-center gap-3 text-ink-soft">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-coral border-t-transparent" />
          Esperando sua mensagem no Telegram…
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Pedidos para conversar:</p>
          {requests.map((r) => (
            <div key={r.code} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-4">
              <div>
                <div className="font-semibold">{r.label}</div>
                <div className="font-mono text-xs text-ink-soft">código {r.code}</div>
              </div>
              <button className="btn-primary" onClick={() => approve(r.code)} disabled={approving !== null}>
                {approving === r.code ? "Aprovando…" : "Sou eu, aprovar"}
              </button>
            </div>
          ))}
        </div>
      )}

      <details className="text-sm text-ink-soft">
        <summary className="cursor-pointer">Tenho o código, quero digitar</summary>
        <div className="mt-3 flex gap-2">
          <input className="input max-w-48 font-mono uppercase" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="ABCD1234" />
          <button className="btn-ghost" onClick={() => approve(manual)} disabled={!manual || approving !== null}>
            Aprovar
          </button>
        </div>
      </details>

      <ErrorBox error={error} />
      <button type="button" className="text-sm text-ink-soft underline hover:text-ink" onClick={onChangeBot}>
        Usar outro bot
      </button>
    </div>
  );
}
