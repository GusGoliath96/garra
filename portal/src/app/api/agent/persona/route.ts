import { setPersona, type Persona } from "@/lib/agents";
import { HttpError, readJson, requireReadyAgent, route } from "@/lib/session";

const TONES = ["amigavel", "profissional", "divertido", "direto"] as const;

export const POST = route(async (ctx, req) => {
  const agent = requireReadyAgent(ctx);
  const b = await readJson<{ name?: string; emoji?: string } & Persona>(req);
  const name = b.name?.trim();
  if (!name || name.length > 40) throw new HttpError(400, "Dê um nome ao agente (até 40 caracteres).");
  if (b.tone && !TONES.includes(b.tone)) throw new HttpError(400, "Tom inválido.");
  if ((b.instructions?.length ?? 0) > 4000) throw new HttpError(400, "Instruções muito longas (máx. 4000).");
  if (b.timezone && !Intl.supportedValuesOf("timeZone").includes(b.timezone)) {
    throw new HttpError(400, "Fuso horário inválido.");
  }
  await setPersona(agent, {
    name,
    emoji: (b.emoji || "🦞").slice(0, 8),
    ownerName: b.ownerName?.slice(0, 80),
    tone: b.tone,
    language: b.language?.slice(0, 60),
    timezone: b.timezone,
    instructions: b.instructions,
  });
  return { ok: true };
});
