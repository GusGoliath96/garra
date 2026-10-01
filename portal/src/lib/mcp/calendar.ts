// Ferramentas de Google Agenda expostas à cell via MCP.
import { calendarApi, CalendarApiError, GoogleAuthError, type GEvent } from "../google";
import { getIntegration, googleAccessToken } from "../integrations";
import type { AgentRow } from "../agents";

export type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: Record<string, unknown>;
};

const ISO_HINT = "Data/hora ISO 8601. Com fuso (2026-10-01T09:00:00-03:00) ou sem (2026-10-01T09:00, usa o fuso do dono).";

export const CALENDAR_TOOLS: ToolDef[] = [
  {
    name: "agenda_listar_eventos",
    description:
      "Lista os compromissos do Google Agenda do dono num intervalo. Use para responder 'o que tenho hoje/amanhã/esta semana', montar o briefing do dia e checar conflitos. Padrão: de agora até 7 dias.",
    inputSchema: {
      type: "object",
      properties: {
        inicio: { type: "string", description: ISO_HINT },
        fim: { type: "string", description: ISO_HINT },
        busca: { type: "string", description: "Texto para filtrar (título, local, participantes)." },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "agenda_criar_evento",
    description:
      "Cria um compromisso no Google Agenda do dono. Antes, confirme com o dono título, dia e horário se houver qualquer dúvida. Convidados recebem convite por e-mail.",
    inputSchema: {
      type: "object",
      required: ["titulo", "inicio", "fim"],
      properties: {
        titulo: { type: "string" },
        inicio: { type: "string", description: ISO_HINT },
        fim: { type: "string", description: ISO_HINT },
        descricao: { type: "string" },
        local: { type: "string" },
        convidados: { type: "array", items: { type: "string" }, description: "E-mails dos convidados." },
        google_meet: { type: "boolean", description: "Gerar link do Google Meet." },
      },
    },
  },
  {
    name: "agenda_atualizar_evento",
    description:
      "Altera um compromisso existente (remarcar, renomear, mudar local ou descrição). Obtenha o evento_id com agenda_listar_eventos. Envie só os campos que mudam.",
    inputSchema: {
      type: "object",
      required: ["evento_id"],
      properties: {
        evento_id: { type: "string" },
        titulo: { type: "string" },
        inicio: { type: "string", description: ISO_HINT },
        fim: { type: "string", description: ISO_HINT },
        descricao: { type: "string" },
        local: { type: "string" },
        notificar_convidados: { type: "boolean", description: "Avisar os convidados da mudança (padrão: sim)." },
      },
    },
  },
  {
    name: "agenda_cancelar_evento",
    description: "Cancela (apaga) um compromisso. Sempre confirme com o dono antes de cancelar.",
    inputSchema: {
      type: "object",
      required: ["evento_id"],
      properties: {
        evento_id: { type: "string" },
        notificar_convidados: { type: "boolean", description: "Avisar os convidados (padrão: sim)." },
      },
    },
    annotations: { destructiveHint: true },
  },
  {
    name: "agenda_horarios_livres",
    description:
      "Encontra horários livres na agenda do dono para encaixar um compromisso, dentro do horário comercial (08h–19h, seg–sex, por padrão).",
    inputSchema: {
      type: "object",
      required: ["duracao_minutos"],
      properties: {
        duracao_minutos: { type: "integer", minimum: 5 },
        inicio: { type: "string", description: ISO_HINT + " Padrão: agora." },
        fim: { type: "string", description: ISO_HINT + " Padrão: daqui a 7 dias." },
        hora_inicio_expediente: { type: "integer", minimum: 0, maximum: 23 },
        hora_fim_expediente: { type: "integer", minimum: 1, maximum: 24 },
        incluir_fim_de_semana: { type: "boolean" },
      },
    },
    annotations: { readOnlyHint: true },
  },
];

// ---------------------------------------------------------------- fuso horário

function tzOffsetMinutes(at: Date, tz: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** Converte "2026-10-01T09:00" (hora local do dono) ou ISO com fuso em Date. */
export function parseWhen(value: string, tz: string): Date {
  const v = value.trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(v)) {
    const d = new Date(v);
    if (isNaN(d.getTime())) throw new ToolInputError(`Data inválida: ${value}`);
    return d;
  }
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) throw new ToolInputError(`Data inválida: ${value}. ${ISO_HINT}`);
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  const off = tzOffsetMinutes(new Date(guess), tz);
  return new Date(guess - off * 60_000);
}

function fmt(d: Date, tz: string, withDate = true) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    ...(withDate ? { weekday: "short", day: "2-digit", month: "2-digit" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function describeEvent(e: GEvent, tz: string) {
  let when: string;
  if (e.start.date) {
    when = `${e.start.date} (dia inteiro)`;
  } else {
    const s = new Date(e.start.dateTime!);
    const en = new Date(e.end.dateTime!);
    when = `${fmt(s, tz)}–${fmt(en, tz, false)}`;
  }
  const extra = [
    e.location && `local: ${e.location}`,
    e.hangoutLink && `meet: ${e.hangoutLink}`,
    e.attendees?.length && `participantes: ${e.attendees.filter((a) => !a.self).map((a) => a.email).join(", ")}`,
  ].filter(Boolean);
  return `• ${when} — ${e.summary ?? "(sem título)"}${extra.length ? ` [${extra.join("; ")}]` : ""} (id: ${e.id})`;
}

// ---------------------------------------------------------------- execução

export class ToolInputError extends Error {}

type Args = Record<string, unknown>;
const str = (a: Args, k: string) => (typeof a[k] === "string" && (a[k] as string).trim() ? (a[k] as string).trim() : undefined);

export async function callCalendarTool(agent: AgentRow, name: string, args: Args): Promise<string> {
  const integ = await getIntegration(agent.id, "google");
  if (!integ) return "O Google Agenda não está conectado. Peça ao dono para conectar em Integrações, no painel da Garra.";
  const tz = agent.persona?.timezone || "America/Sao_Paulo";
  let token: string;
  try {
    token = await googleAccessToken(integ);
  } catch (e) {
    if (e instanceof GoogleAuthError) return "O acesso ao Google Agenda expirou. Peça ao dono para reconectar no painel da Garra.";
    throw e;
  }

  try {
    switch (name) {
      case "agenda_listar_eventos": {
        const start = str(args, "inicio") ? parseWhen(str(args, "inicio")!, tz) : new Date();
        const end = str(args, "fim") ? parseWhen(str(args, "fim")!, tz) : new Date(start.getTime() + 7 * 86_400_000);
        const data = await calendarApi<{ items: GEvent[] }>(token, "/calendars/primary/events", {
          query: {
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            singleEvents: "true",
            orderBy: "startTime",
            maxResults: "100",
            q: str(args, "busca"),
          },
        });
        const items = (data.items ?? []).filter((e) => e.status !== "cancelled");
        if (!items.length) return `Nenhum compromisso entre ${fmt(start, tz)} e ${fmt(end, tz)}.`;
        return `Compromissos (${tz}):\n${items.map((e) => describeEvent(e, tz)).join("\n")}`;
      }

      case "agenda_criar_evento": {
        const titulo = str(args, "titulo");
        if (!titulo || !str(args, "inicio") || !str(args, "fim")) throw new ToolInputError("titulo, inicio e fim são obrigatórios.");
        const start = parseWhen(str(args, "inicio")!, tz);
        const end = parseWhen(str(args, "fim")!, tz);
        if (end <= start) throw new ToolInputError("O fim precisa ser depois do início.");
        const attendees = Array.isArray(args.convidados) ? (args.convidados as unknown[]).filter((x) => typeof x === "string") : [];
        const meet = args.google_meet === true;
        const ev = await calendarApi<GEvent>(token, "/calendars/primary/events", {
          method: "POST",
          query: { sendUpdates: attendees.length ? "all" : "none", conferenceDataVersion: meet ? "1" : undefined },
          body: {
            summary: titulo,
            description: str(args, "descricao"),
            location: str(args, "local"),
            start: { dateTime: start.toISOString(), timeZone: tz },
            end: { dateTime: end.toISOString(), timeZone: tz },
            attendees: attendees.map((email) => ({ email })),
            ...(meet ? { conferenceData: { createRequest: { requestId: crypto.randomUUID() } } } : {}),
          },
        });
        return `Compromisso criado:\n${describeEvent(ev, tz)}`;
      }

      case "agenda_atualizar_evento": {
        const id = str(args, "evento_id");
        if (!id) throw new ToolInputError("evento_id é obrigatório.");
        const patch: Record<string, unknown> = {};
        if (str(args, "titulo")) patch.summary = str(args, "titulo");
        if (str(args, "descricao")) patch.description = str(args, "descricao");
        if (str(args, "local")) patch.location = str(args, "local");
        if (str(args, "inicio")) patch.start = { dateTime: parseWhen(str(args, "inicio")!, tz).toISOString(), timeZone: tz };
        if (str(args, "fim")) patch.end = { dateTime: parseWhen(str(args, "fim")!, tz).toISOString(), timeZone: tz };
        if (!Object.keys(patch).length) throw new ToolInputError("Nada para alterar.");
        const ev = await calendarApi<GEvent>(token, `/calendars/primary/events/${encodeURIComponent(id)}`, {
          method: "PATCH",
          query: { sendUpdates: args.notificar_convidados === false ? "none" : "all" },
          body: patch,
        });
        return `Compromisso atualizado:\n${describeEvent(ev, tz)}`;
      }

      case "agenda_cancelar_evento": {
        const id = str(args, "evento_id");
        if (!id) throw new ToolInputError("evento_id é obrigatório.");
        await calendarApi(token, `/calendars/primary/events/${encodeURIComponent(id)}`, {
          method: "DELETE",
          query: { sendUpdates: args.notificar_convidados === false ? "none" : "all" },
        });
        return "Compromisso cancelado.";
      }

      case "agenda_horarios_livres": {
        const dur = Number(args.duracao_minutos);
        if (!Number.isFinite(dur) || dur < 5) throw new ToolInputError("duracao_minutos inválida.");
        const start = str(args, "inicio") ? parseWhen(str(args, "inicio")!, tz) : new Date();
        const end = str(args, "fim") ? parseWhen(str(args, "fim")!, tz) : new Date(start.getTime() + 7 * 86_400_000);
        const h0 = Number(args.hora_inicio_expediente ?? 8);
        const h1 = Number(args.hora_fim_expediente ?? 19);
        const weekends = args.incluir_fim_de_semana === true;
        const fb = await calendarApi<{ calendars: { primary: { busy: { start: string; end: string }[] } } }>(token, "/freeBusy", {
          method: "POST",
          body: { timeMin: start.toISOString(), timeMax: end.toISOString(), timeZone: tz, items: [{ id: "primary" }] },
        });
        const busy = fb.calendars.primary.busy.map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime()] as const);
        const slots = freeSlots(start, end, busy, dur, h0, h1, weekends, tz);
        if (!slots.length) return "Nenhum horário livre com essa duração no período.";
        return `Horários livres de ${dur} min (${tz}):\n${slots
          .slice(0, 12)
          .map(([s, e]) => `• ${fmt(new Date(s), tz)}–${fmt(new Date(e), tz, false)}`)
          .join("\n")}`;
      }
    }
    throw new ToolInputError(`Ferramenta desconhecida: ${name}`);
  } catch (e) {
    if (e instanceof CalendarApiError) {
      if (e.status === 404) return "Compromisso não encontrado. Liste os eventos de novo para pegar o id certo.";
      if (e.status === 401 || e.status === 403) return `O Google recusou o acesso (${e.message}). Peça ao dono para reconectar no painel.`;
      return `Erro do Google Agenda: ${e.message}`;
    }
    throw e;
  }
}

/** Janelas livres dentro do expediente, em blocos de pelo menos `dur` minutos. */
function freeSlots(
  start: Date,
  end: Date,
  busy: readonly (readonly [number, number])[],
  dur: number,
  h0: number,
  h1: number,
  weekends: boolean,
  tz: string,
): [number, number][] {
  const out: [number, number][] = [];
  const durMs = dur * 60_000;
  // Percorre dia a dia no fuso do dono.
  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });
  for (let t = start.getTime(); t < end.getTime() && out.length < 30; t += 86_400_000) {
    const day = dayFmt.format(new Date(t));
    const wd = weekdayFmt.format(new Date(t));
    if (!weekends && (wd === "Sat" || wd === "Sun")) continue;
    let cursor = Math.max(parseWhen(`${day}T${String(h0).padStart(2, "0")}:00`, tz).getTime(), start.getTime());
    const dayEnd = Math.min(parseWhen(`${day}T${String(Math.min(h1, 23)).padStart(2, "0")}:${h1 === 24 ? "59" : "00"}`, tz).getTime(), end.getTime());
    const blocks = busy.filter(([bs, be]) => be > cursor && bs < dayEnd).sort((a, b) => a[0] - b[0]);
    for (const [bs, be] of blocks) {
      if (bs - cursor >= durMs) out.push([cursor, bs]);
      cursor = Math.max(cursor, be);
    }
    if (dayEnd - cursor >= durMs) out.push([cursor, dayEnd]);
  }
  return out;
}
