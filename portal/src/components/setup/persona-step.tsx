"use client";

import { useState } from "react";
import { api, ErrorBox, type Agent } from "./api";

const EMOJIS = ["🦞", "🦊", "🐙", "🦉", "🐝", "🌻", "🤖", "✨"];
const TONES = [
  { id: "amigavel", label: "Amigável", text: "Calorosa e próxima" },
  { id: "profissional", label: "Profissional", text: "Clara e objetiva" },
  { id: "divertido", label: "Divertida", text: "Bem-humorada" },
  { id: "direto", label: "Direta", text: "Curta e sem rodeios" },
] as const;

const COMMON_TZ = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Fortaleza",
  "America/Recife",
  "America/Cuiaba",
  "America/Rio_Branco",
  "America/Noronha",
  "Europe/Lisbon",
];

export function PersonaStep({
  agent,
  ownerName,
  onDone,
  submitLabel = "Continuar",
}: {
  agent: Agent;
  ownerName: string;
  onDone: () => void;
  submitLabel?: string;
}) {
  const p = agent.persona ?? {};
  const browserTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/Sao_Paulo";
  const [name, setName] = useState(agent.name ?? "Lia");
  const [emoji, setEmoji] = useState(agent.emoji ?? "🦞");
  const [owner, setOwner] = useState(p.ownerName ?? ownerName);
  const [tone, setTone] = useState(p.tone ?? "amigavel");
  const [timezone, setTimezone] = useState(p.timezone ?? browserTz);
  const [instructions, setInstructions] = useState(p.instructions ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const tzs = Array.from(new Set([timezone, ...COMMON_TZ]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/agent/persona", {
        body: { name, emoji, ownerName: owner, tone, timezone, instructions, language: "português do Brasil" },
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight">Quem é a sua assistente?</h2>
        <p className="mt-1.5 text-ink-soft">Dê um nome e um jeito de ser. Dá pra mudar tudo depois.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="label" htmlFor="name">Nome</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
        </div>
        <div>
          <span className="label">Emoji</span>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setEmoji(em)}
                className={`grid h-11 w-11 place-items-center rounded-xl border-2 text-xl transition ${
                  emoji === em ? "border-coral bg-coral-soft" : "border-line bg-paper hover:border-ink/30"
                }`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <span className="label">Jeito de falar</span>
        <div className="grid gap-2 sm:grid-cols-4">
          {TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTone(t.id)}
              className={`rounded-2xl border-2 p-3 text-left transition ${
                tone === t.id ? "border-coral bg-coral-soft/40" : "border-line bg-paper hover:border-ink/30"
              }`}
            >
              <div className="font-semibold">{t.label}</div>
              <div className="text-xs text-ink-soft">{t.text}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="owner">Como ela deve te chamar?</label>
          <input id="owner" className="input" value={owner} onChange={(e) => setOwner(e.target.value)} maxLength={80} />
        </div>
        <div>
          <label className="label" htmlFor="tz">Seu fuso horário</label>
          <select id="tz" className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {tzs.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="instr">
          O que ela precisa saber? <span className="font-normal text-ink-soft">(opcional)</span>
        </label>
        <textarea
          id="instr"
          className="input min-h-28"
          placeholder="Ex.: Sou designer freelancer, tenho dois gatos (Mingau e Pipoca). Prefiro respostas curtas e lembretes sempre de manhã."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          maxLength={4000}
        />
      </div>

      <ErrorBox error={error} />
      <button className="btn-primary" disabled={loading}>
        {loading ? "Salvando…" : submitLabel}
      </button>
    </form>
  );
}
