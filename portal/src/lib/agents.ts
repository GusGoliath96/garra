// Serviço de domínio: provisiona e configura o agente (cell) de uma organização.
import { randomBytes } from "node:crypto";
import { query, queryOne } from "./db";
import { decrypt, encrypt } from "./crypto";
import { FleetDriver } from "./cells/fleet-driver";
import type { CellDriver, InteractiveExec } from "./cells/driver";
import { GatewayClient } from "./cells/gateway";
import { PROVIDERS, type LlmMode, type ProviderId } from "./llm";

const WORKSPACE = "/home/node/.openclaw/workspace";

const g = globalThis as unknown as {
  __oauth?: Map<string, OAuthSession>;
  __provisioning?: Set<string>;
};
// Driver não guarda estado: pode ser recriado a cada reload do dev server.
export const driver: CellDriver = new FleetDriver();
// Sessões de login por assinatura em andamento (processo único no MVP).
const oauthSessions: Map<string, OAuthSession> = (g.__oauth ??= new Map());
const provisioning: Set<string> = (g.__provisioning ??= new Set());

export type AgentRow = {
  id: string;
  organization_id: string;
  tenant: string;
  status: "provisioning" | "ready" | "error" | "stopped" | "deleting";
  status_detail: string | null;
  port: number | null;
  gateway_token_enc: string | null;
  setup_step: "llm" | "persona" | "telegram" | "done";
  llm_provider: ProviderId | null;
  llm_mode: LlmMode | null;
  llm_model: string | null;
  name: string | null;
  emoji: string | null;
  persona: Persona;
  telegram_bot: string | null;
  created_at: string;
  updated_at: string;
};

export type Persona = {
  ownerName?: string;
  tone?: "amigavel" | "profissional" | "divertido" | "direto";
  language?: string;
  timezone?: string;
  instructions?: string;
};

export type PublicAgent = Omit<AgentRow, "gateway_token_enc" | "organization_id" | "port">;

export function toPublic(a: AgentRow): PublicAgent {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { gateway_token_enc, organization_id, port, ...rest } = a;
  return rest;
}

// ---------------------------------------------------------------- organização

export async function ensurePersonalOrg(user: { id: string; name: string }): Promise<string> {
  const existing = await queryOne<{ organization_id: string }>(
    `SELECT organization_id FROM organization_member WHERE user_id = $1 ORDER BY created_at LIMIT 1`,
    [user.id],
  );
  if (existing) return existing.organization_id;
  const org = await queryOne<{ id: string }>(
    `INSERT INTO organization (name, kind) VALUES ($1, 'personal') RETURNING id`,
    [user.name || "Pessoal"],
  );
  await query(`INSERT INTO organization_member (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [
    org!.id,
    user.id,
  ]);
  return org!.id;
}

export async function getAgentForOrg(orgId: string): Promise<AgentRow | null> {
  return queryOne<AgentRow>(`SELECT * FROM agent WHERE organization_id = $1 AND status <> 'deleting' LIMIT 1`, [orgId]);
}

async function update(id: string, fields: Partial<AgentRow>) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = keys.map((k) => {
    const v = (fields as Record<string, unknown>)[k];
    return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
  });
  await query(`UPDATE agent SET ${sets}, updated_at = now() WHERE id = $1`, [id, ...values]);
}

export async function logEvent(agentId: string, type: string, data: Record<string, unknown> = {}) {
  await query(`INSERT INTO agent_event (agent_id, type, data) VALUES ($1, $2, $3)`, [agentId, type, JSON.stringify(data)]);
}

function gateway(a: AgentRow): GatewayClient {
  if (!a.port || !a.gateway_token_enc) throw new Error("agente ainda não provisionado");
  return new GatewayClient(driver.gatewayUrl(a.port), decrypt(a.gateway_token_enc));
}

// ---------------------------------------------------------------- provisionamento

/** Cria o registro e dispara a criação da cell em segundo plano. Idempotente. */
export async function startProvisioning(orgId: string): Promise<AgentRow> {
  const current = await getAgentForOrg(orgId);
  if (current && current.status !== "error") return current;

  let agent = current;
  if (!agent) {
    const tenant = `u-${randomBytes(6).toString("hex")}`;
    agent = (await queryOne<AgentRow>(
      `INSERT INTO agent (organization_id, tenant) VALUES ($1, $2) RETURNING *`,
      [orgId, tenant],
    ))!;
  } else {
    await update(agent.id, { status: "provisioning", status_detail: null });
  }
  void provision(agent);
  return (await getAgentForOrg(orgId))!;
}

async function provision(agent: AgentRow) {
  if (provisioning.has(agent.id)) return;
  provisioning.add(agent.id);
  try {
    await update(agent.id, { status_detail: "Criando seu servidor…" });
    let port = agent.port;
    let tokenEnc = agent.gateway_token_enc;
    if ((await driver.state(agent.tenant)) === "missing") {
      const cell = await driver.create(agent.tenant);
      port = cell.port;
      tokenEnc = encrypt(cell.token);
      await update(agent.id, { port, gateway_token_enc: tokenEnc });
    }
    await update(agent.id, { status_detail: "Preparando o agente…" });
    // Habilita a API administrativa (só acessível pelo portal, via 127.0.0.1).
    const en = await driver.openclaw(agent.tenant, ["plugins", "enable", "admin-http-rpc"]);
    if (en.exitCode !== 0) throw new Error(`plugins enable: ${en.output.slice(-300)}`);

    // Cria workspace (AGENTS.md, SOUL.md…) sem rodar o onboarding interativo.
    const setup = await driver.openclaw(agent.tenant, ["setup", "--baseline"]);
    if (setup.exitCode !== 0) throw new Error(`setup: ${setup.output.slice(-300)}`);

    const fresh = (await queryOne<AgentRow>(`SELECT * FROM agent WHERE id = $1`, [agent.id]))!;
    const gw = gateway(fresh);
    await waitFor(async () => (await gw.health()).ok, 60_000);
    await gw.configPatch({
      agents: { defaults: { userTimezone: "America/Sao_Paulo" } },
    });
    await update(agent.id, { status: "ready", status_detail: null });
    await logEvent(agent.id, "provisioned", { port });
  } catch (e) {
    console.error("provision failed", agent.tenant, e);
    await update(agent.id, { status: "error", status_detail: errorMessage(e) });
    await logEvent(agent.id, "provision_failed", { error: errorMessage(e) });
  } finally {
    provisioning.delete(agent.id);
  }
}

async function waitFor(fn: () => Promise<boolean>, timeoutMs: number) {
  const until = Date.now() + timeoutMs;
  let lastErr: unknown;
  while (Date.now() < until) {
    try {
      if (await fn()) return;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`tempo esgotado esperando o gateway (${errorMessage(lastErr)})`);
}

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

// ---------------------------------------------------------------- LLM

async function applyModel(a: AgentRow, provider: ProviderId) {
  const model = PROVIDERS[provider].defaultModel;
  const r = await driver.openclaw(a.tenant, ["models", "set", model]);
  if (r.exitCode !== 0) throw new Error(`models set: ${r.output.slice(-300)}`);
  // As credenciais foram gravadas pelo CLI; pede ao gateway para recarregar.
  await gateway(a).call("gateway.restart.request", {}).catch(() => driver.restart(a.tenant));
  return model;
}

/** Chave de API ou token de assinatura colado pelo usuário (vai por stdin, nunca por argv). */
export async function setLlmCredential(a: AgentRow, provider: ProviderId, mode: LlmMode, secret: string) {
  const cmd = mode === "api_key" ? "paste-api-key" : "paste-token";
  const r = await driver.openclaw(a.tenant, ["models", "auth", cmd, "--provider", provider], {
    stdin: secret.trim() + "\n",
  });
  if (r.exitCode !== 0) throw new Error(`Não foi possível salvar a credencial: ${r.output.slice(-300)}`);
  const model = await applyModel(a, provider);
  await update(a.id, {
    llm_provider: provider,
    llm_mode: mode,
    llm_model: model,
    setup_step: a.setup_step === "llm" ? "persona" : a.setup_step,
  });
  await logEvent(a.id, "llm_configured", { provider, mode });
}

export type OAuthSession = {
  agentId: string;
  provider: ProviderId;
  kind: "device_code" | "claude_code";
  // waiting_user: usuário digita o código na página do provedor (device-code)
  // waiting_code: usuário cola aqui o código que o provedor mostrou (Claude)
  status: "starting" | "waiting_user" | "waiting_code" | "finishing" | "done" | "error";
  url?: string;
  code?: string;
  error?: string;
  startedAt: number;
  proc?: InteractiveExec;
};

/** Login por assinatura via device-code (OpenAI/ChatGPT): devolve URL + código para o usuário. */
export async function startDeviceLogin(a: AgentRow, provider: ProviderId): Promise<OAuthSession> {
  const prev = oauthSessions.get(a.id);
  if (prev?.kind === "device_code" && isPending(prev)) return prev;
  prev?.proc?.kill();

  const session: OAuthSession = { agentId: a.id, provider, kind: "device_code", status: "starting", startedAt: Date.now() };
  oauthSessions.set(a.id, session);
  const proc = await driver.openclawInteractive(a.tenant, [
    "models", "auth", "login", "--provider", provider, "--device-code", "--force",
  ]);
  session.proc = proc;

  // Extrai URL e código da saída do CLI assim que aparecerem.
  const poll = setInterval(() => {
    const out = proc.output();
    const url = out.match(/https:\/\/[^\s>]+\/device[^\s>]*/)?.[0];
    const code = out.match(/\b[A-Z0-9]{4}-[A-Z0-9]{4,6}\b/)?.[0];
    if (url && code && session.status === "starting") {
      Object.assign(session, { url, code, status: "waiting_user" });
    }
  }, 300);

  proc.done.then(async (res) => {
    clearInterval(poll);
    if (res.exitCode === 0) {
      try {
        await markSubscriptionDone(a.id, provider);
        session.status = "done";
      } catch (e) {
        Object.assign(session, { status: "error", error: errorMessage(e) });
      }
    } else if (session.status !== "done") {
      const tail = res.output.trim().split("\n").slice(-4).join(" ");
      Object.assign(session, { status: "error", error: tail || `saiu com código ${res.exitCode}` });
    }
  });

  // Espera um pouco pelo código para já devolver na primeira resposta.
  const until = Date.now() + 20_000;
  while (session.status === "starting" && Date.now() < until) await new Promise((r) => setTimeout(r, 300));
  return session;
}

function isPending(s: OAuthSession) {
  return ["starting", "waiting_user", "waiting_code", "finishing"].includes(s.status) && Date.now() - s.startedAt < 14 * 60_000;
}

async function markSubscriptionDone(agentId: string, provider: ProviderId) {
  const fresh = (await queryOne<AgentRow>(`SELECT * FROM agent WHERE id = $1`, [agentId]))!;
  const model = await applyModel(fresh, provider);
  await update(agentId, {
    llm_provider: provider,
    llm_mode: "subscription",
    llm_model: model,
    setup_step: fresh.setup_step === "llm" ? "persona" : fresh.setup_step,
  });
  await logEvent(agentId, "llm_configured", { provider, mode: "subscription" });
}

/**
 * Login da assinatura Claude: roda `claude setup-token` (Claude Code embutido na imagem) dentro
 * da cell. Ele gera o link de autorização do claude.ai; o usuário autoriza e cola aqui o código
 * que a Anthropic mostra. O token resultante vai direto para a cell — o usuário nunca o vê.
 */
export async function startClaudeLogin(a: AgentRow): Promise<OAuthSession> {
  const prev = oauthSessions.get(a.id);
  if (prev?.kind === "claude_code" && isPending(prev) && prev.status !== "finishing") return prev;
  prev?.proc?.kill();

  const session: OAuthSession = { agentId: a.id, provider: "anthropic", kind: "claude_code", status: "starting", startedAt: Date.now() };
  oauthSessions.set(a.id, session);
  const proc = await driver.claudeInteractive(a.tenant, ["setup-token"]);
  session.proc = proc;

  const poll = setInterval(() => {
    if (session.status !== "starting") return;
    // Junta quebras de linha caso o terminal tenha quebrado a URL.
    const flat = proc.output().replace(/\n(?=[A-Za-z0-9%&=_.~-])/g, "");
    const url = flat.match(/https:\/\/claude\.(?:ai|com)\/[^\s]*oauth\/authorize\?[^\s]+/)?.[0];
    if (url) Object.assign(session, { url, status: "waiting_code" });
  }, 300);

  proc.done.then((res) => {
    clearInterval(poll);
    if (session.status === "starting" || session.status === "waiting_code") {
      const tail = res.output.trim().split("\n").slice(-3).join(" ");
      Object.assign(session, { status: "error", error: tail || "O login do Claude foi encerrado." });
    }
  });

  const until = Date.now() + 25_000;
  while (session.status === "starting" && Date.now() < until) await new Promise((r) => setTimeout(r, 300));
  if (session.status === "starting") {
    proc.kill();
    Object.assign(session, { status: "error", error: "O Claude não gerou o link de login a tempo." });
  }
  return session;
}

/** Recebe o código mostrado pela Anthropic, entrega ao Claude Code e guarda o token na cell. */
export async function submitClaudeCode(a: AgentRow, code: string): Promise<OAuthSession> {
  const session = oauthSessions.get(a.id);
  if (!session || session.kind !== "claude_code" || session.status !== "waiting_code" || !session.proc) {
    throw new Error("Nenhum login do Claude em andamento. Clique em “Entrar com o Claude” de novo.");
  }
  const proc = session.proc;
  session.status = "finishing";
  const before = proc.output().length;
  // O Claude Code trata texto longo como "colagem": o Enter precisa ir separado,
  // senão vira parte do texto colado e nada acontece.
  proc.write(code.trim());
  await new Promise((r) => setTimeout(r, 800));
  proc.write("\r");

  const until = Date.now() + 60_000;
  let token: string | undefined;
  let lastLen = proc.output().length;
  let lastChange = Date.now();
  let enterRetries = 0;
  while (Date.now() < until) {
    const len = proc.output().length;
    if (len !== lastLen) {
      lastLen = len;
      lastChange = Date.now();
    } else if (Date.now() - lastChange > 4000 && enterRetries < 2) {
      // Nada mudou: reenvia o Enter.
      proc.write("\r");
      enterRetries++;
      lastChange = Date.now();
    }
    const out = proc.output().slice(before).replace(/\s+/g, "");
    token = out.match(/sk-ant-oat01-[A-Za-z0-9_-]{20,}/)?.[0];
    if (token) break;
    if (/invalid|error|failed|expired/i.test(proc.output().slice(before))) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  proc.kill();
  if (!token) {
    const msg = proc.output().slice(before).trim().split("\n").slice(-2).join(" ");
    Object.assign(session, { status: "error", error: `O Claude não aceitou o código. ${msg}`.trim() });
    return session;
  }
  try {
    const r = await driver.openclaw(a.tenant, ["models", "auth", "paste-token", "--provider", "anthropic"], {
      stdin: token + "\n",
    });
    if (r.exitCode !== 0) throw new Error(r.output.slice(-300));
    await markSubscriptionDone(a.id, "anthropic");
    session.status = "done";
  } catch (e) {
    Object.assign(session, { status: "error", error: errorMessage(e) });
  }
  return session;
}

export function getOAuthSession(agentId: string) {
  return oauthSessions.get(agentId) ?? null;
}

export function publicOAuth(s: OAuthSession | null) {
  if (!s) return null;
  return { provider: s.provider, kind: s.kind, status: s.status, url: s.url, code: s.code, error: s.error };
}

// ---------------------------------------------------------------- persona

const TONES: Record<NonNullable<Persona["tone"]>, string> = {
  amigavel: "Calorosa, próxima e acolhedora. Usa linguagem simples e um toque de bom humor.",
  profissional: "Clara, educada e objetiva, como uma assistente executiva experiente.",
  divertido: "Bem-humorada e espirituosa, sem perder a utilidade. Pode usar emojis com moderação.",
  direto: "Curta e direta ao ponto. Sem rodeios, sem floreios.",
};

export async function setPersona(a: AgentRow, input: { name: string; emoji: string } & Persona) {
  const persona: Persona = {
    ownerName: input.ownerName?.trim(),
    tone: input.tone ?? "amigavel",
    language: input.language || "português do Brasil",
    timezone: input.timezone || "America/Sao_Paulo",
    instructions: input.instructions?.trim(),
  };
  const soul = [
    `# ${input.name}`,
    "",
    `Você é ${input.name}, a assistente pessoal de ${persona.ownerName || "seu dono"}.`,
    "",
    "## Tom",
    TONES[persona.tone!],
    "",
    "## Idioma",
    `Responda sempre em ${persona.language}, a menos que peçam outro idioma.`,
    ...(persona.instructions ? ["", "## Instruções do dono", persona.instructions] : []),
    "",
  ].join("\n");
  const user = [
    "# Sobre o dono",
    "",
    `- Nome: ${persona.ownerName || "(não informado)"}`,
    `- Fuso horário: ${persona.timezone}`,
    `- Idioma preferido: ${persona.language}`,
    "",
  ].join("\n");

  const identity = [
    "# IDENTITY.md",
    "",
    `- **Name:** ${input.name}`,
    `- **Vibe:** ${TONES[persona.tone!]}`,
    `- **Emoji:** ${input.emoji}`,
    "",
  ].join("\n");

  await driver.writeFile(a.tenant, `${WORKSPACE}/SOUL.md`, soul);
  await driver.writeFile(a.tenant, `${WORKSPACE}/USER.md`, user);
  await driver.writeFile(a.tenant, `${WORKSPACE}/IDENTITY.md`, identity);
  // Persona já definida pelo portal: remove o ritual de "primeira conversa" do OpenClaw.
  await driver.exec(a.tenant, ["rm", "-f", `${WORKSPACE}/BOOTSTRAP.md`]);

  await gateway(a).configPatch({
    agents: {
      defaults: { userTimezone: persona.timezone },
      entries: { main: { identity: { name: input.name, emoji: input.emoji } } },
    },
  });
  await update(a.id, {
    name: input.name,
    emoji: input.emoji,
    persona,
    setup_step: a.setup_step === "persona" ? "telegram" : a.setup_step,
  });
  await logEvent(a.id, "persona_updated");
}

// ---------------------------------------------------------------- Telegram

export async function setTelegram(a: AgentRow, botToken: string, botUsername: string) {
  await gateway(a).configPatch({
    channels: {
      telegram: {
        enabled: true,
        botToken: botToken.trim(),
        dmPolicy: "pairing",
      },
    },
  });
  await update(a.id, { telegram_bot: botUsername });
  await logEvent(a.id, "telegram_configured", { bot: botUsername });
}

export type PairingRequest = { code: string; label: string };

export async function listPairing(a: AgentRow): Promise<PairingRequest[]> {
  const r = await driver.openclaw(a.tenant, ["pairing", "list", "telegram", "--json"]);
  if (r.exitCode !== 0) return [];
  const text = r.output;
  const start = text.search(/[[{]/);
  if (start < 0) return [];
  let data: unknown;
  try {
    data = JSON.parse(text.slice(start));
  } catch {
    return [];
  }
  // Formato tolerante: aceita lista direta ou { requests: [...] }.
  const list = (Array.isArray(data) ? data : ((data as Record<string, unknown>).requests ?? (data as Record<string, unknown>).pending ?? [])) as Record<string, unknown>[];
  return list
    .filter((x) => typeof x.code === "string")
    .map((x) => {
      const meta = (x.meta ?? x.sender ?? {}) as Record<string, unknown>;
      const label =
        [meta.username && `@${meta.username}`, meta.firstName ?? meta.first_name ?? meta.name, x.id ?? x.senderId]
          .filter(Boolean)
          .join(" · ") || "Contato do Telegram";
      return { code: x.code as string, label: String(label) };
    });
}

export async function approvePairing(a: AgentRow, code: string) {
  if (!/^[A-Za-z0-9-]{3,32}$/.test(code)) throw new Error("código inválido");
  const r = await driver.openclaw(a.tenant, ["pairing", "approve", "telegram", code, "--notify"]);
  if (r.exitCode !== 0) throw new Error(r.output.trim().split("\n").slice(-2).join(" "));
  if (a.setup_step === "telegram") await update(a.id, { setup_step: "done" });
  await logEvent(a.id, "telegram_paired");
}

export async function skipTelegram(a: AgentRow) {
  if (a.setup_step === "telegram") await update(a.id, { setup_step: "done" });
}

// ---------------------------------------------------------------- painel

export async function agentHealth(a: AgentRow) {
  const state = await driver.state(a.tenant);
  if (state !== "running" || a.status !== "ready") return { container: state, gateway: null };
  try {
    const gw = gateway(a);
    const [health, channels] = await Promise.all([
      gw.health(),
      gw.call<Record<string, unknown>>("channels.status").catch(() => null),
    ]);
    return { container: state, gateway: { ok: health.ok }, channels };
  } catch (e) {
    return { container: state, gateway: { ok: false, error: errorMessage(e) } };
  }
}

export async function restartAgent(a: AgentRow) {
  await driver.restart(a.tenant);
  await logEvent(a.id, "restarted");
}

export async function deleteAgent(a: AgentRow) {
  await update(a.id, { status: "deleting" });
  oauthSessions.get(a.id)?.proc?.kill();
  await driver.remove(a.tenant, { purgeData: true });
  await query(`DELETE FROM agent WHERE id = $1`, [a.id]);
}
