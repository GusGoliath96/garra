// Integrações do agente (Google Agenda). O portal guarda as credenciais cifradas e expõe
// ferramentas para a cell via MCP (/api/mcp), autenticada por um token próprio do agente.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { query, queryOne } from "./db";
import { decrypt, encrypt } from "./crypto";
import { gateway, logEvent, type AgentRow } from "./agents";
import {
  exchangeCode,
  fetchEmail,
  GoogleAuthError,
  refreshAccessToken,
  revokeToken,
} from "./google";

export type IntegrationRow = {
  id: string;
  agent_id: string;
  provider: "google";
  account_email: string | null;
  scopes: string;
  refresh_token_enc: string;
  access_token_enc: string | null;
  access_expires_at: string | null;
  status: "active" | "error";
  status_detail: string | null;
  created_at: string;
};

export type PublicIntegration = Pick<IntegrationRow, "provider" | "account_email" | "status" | "status_detail" | "created_at">;

const MCP_SERVER_NAME = "google_agenda";

// ---------------------------------------------------------------- state do OAuth

function hmac(data: string) {
  return createHmac("sha256", process.env.APP_SECRET_KEY!).update(data).digest("base64url");
}

/** State assinado: amarra o retorno do Google ao agente e expira em 10 min. */
export function signState(agentId: string) {
  const payload = Buffer.from(JSON.stringify({ a: agentId, n: randomBytes(8).toString("hex"), e: Date.now() + 10 * 60_000 })).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function verifyState(state: string): string | null {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(hmac(payload));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { a: string; e: number };
  return data.e > Date.now() ? data.a : null;
}

// ---------------------------------------------------------------- consultas

export async function listIntegrations(agentId: string): Promise<PublicIntegration[]> {
  return query<PublicIntegration>(
    `SELECT provider, account_email, status, status_detail, created_at FROM integration WHERE agent_id = $1`,
    [agentId],
  );
}

export async function getIntegration(agentId: string, provider: "google") {
  return queryOne<IntegrationRow>(`SELECT * FROM integration WHERE agent_id = $1 AND provider = $2`, [agentId, provider]);
}

/** Access token válido (renova pelo refresh token quando expira). */
export async function googleAccessToken(integ: IntegrationRow): Promise<string> {
  if (integ.access_token_enc && integ.access_expires_at && new Date(integ.access_expires_at).getTime() > Date.now() + 60_000) {
    return decrypt(integ.access_token_enc);
  }
  try {
    const t = await refreshAccessToken(decrypt(integ.refresh_token_enc));
    await query(
      `UPDATE integration SET access_token_enc = $2, access_expires_at = now() + make_interval(secs => $3),
         status = 'active', status_detail = NULL, updated_at = now() WHERE id = $1`,
      [integ.id, encrypt(t.access_token), t.expires_in],
    );
    return t.access_token;
  } catch (e) {
    if (e instanceof GoogleAuthError) {
      await query(`UPDATE integration SET status = 'error', status_detail = $2, updated_at = now() WHERE id = $1`, [
        integ.id,
        "O acesso ao Google expirou ou foi revogado. Reconecte no painel.",
      ]);
    }
    throw e;
  }
}

// ---------------------------------------------------------------- conectar / desconectar

/** Troca o código do OAuth, guarda as credenciais e liga as ferramentas na cell. */
export async function connectGoogle(agent: AgentRow, code: string) {
  const t = await exchangeCode(code);
  if (!t.refresh_token) throw new Error("O Google não devolveu acesso permanente. Tente conectar de novo.");
  const granted = t.scope.split(" ");
  if (!granted.includes("https://www.googleapis.com/auth/calendar.events")) {
    throw new Error("Para a assistente cuidar da agenda, marque a permissão do Google Agenda na tela do Google.");
  }
  const email = await fetchEmail(t.access_token);
  await query(
    `INSERT INTO integration (agent_id, provider, account_email, scopes, refresh_token_enc, access_token_enc, access_expires_at)
     VALUES ($1, 'google', $2, $3, $4, $5, now() + make_interval(secs => $6))
     ON CONFLICT (agent_id, provider) DO UPDATE SET account_email = EXCLUDED.account_email, scopes = EXCLUDED.scopes,
       refresh_token_enc = EXCLUDED.refresh_token_enc, access_token_enc = EXCLUDED.access_token_enc,
       access_expires_at = EXCLUDED.access_expires_at, status = 'active', status_detail = NULL, updated_at = now()`,
    [agent.id, email, t.scope, encrypt(t.refresh_token), encrypt(t.access_token), t.expires_in],
  );
  await attachMcp(agent);
  await logEvent(agent.id, "google_connected", { email });
}

export async function disconnectGoogle(agent: AgentRow) {
  const integ = await getIntegration(agent.id, "google");
  if (integ) {
    await revokeToken(decrypt(integ.refresh_token_enc));
    await query(`DELETE FROM integration WHERE id = $1`, [integ.id]);
  }
  await detachMcp(agent);
  await logEvent(agent.id, "google_disconnected");
}

// ---------------------------------------------------------------- MCP na cell

export function hashMcpToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function agentByMcpToken(token: string) {
  return queryOne<AgentRow>(`SELECT * FROM agent WHERE mcp_token_hash = $1 AND status = 'ready'`, [hashMcpToken(token)]);
}

/** URL que as cells usam para falar com o MCP do portal. */
function mcpUrl() {
  return process.env.CELL_MCP_URL ?? `${process.env.BETTER_AUTH_URL}/api/mcp`;
}

/**
 * Gera um token novo para o agente (só o hash fica no banco) e registra o servidor MCP na cell.
 * O token só dá acesso às integrações do próprio agente.
 */
async function attachMcp(agent: AgentRow) {
  const token = `gmcp_${randomBytes(24).toString("base64url")}`;
  await query(`UPDATE agent SET mcp_token_hash = $2, updated_at = now() WHERE id = $1`, [agent.id, hashMcpToken(token)]);
  await gateway(agent).configPatch({
    mcp: {
      servers: {
        [MCP_SERVER_NAME]: {
          url: mcpUrl(),
          transport: "streamable-http",
          enabled: true,
          headers: { Authorization: `Bearer ${token}` },
          connectionTimeoutMs: 10_000,
          requestTimeoutMs: 30_000,
        },
      },
    },
  });
}

async function detachMcp(agent: AgentRow) {
  await query(`UPDATE agent SET mcp_token_hash = NULL, updated_at = now() WHERE id = $1`, [agent.id]);
  await gateway(agent)
    .configPatch({ mcp: { servers: { [MCP_SERVER_NAME]: null } } })
    .catch(() => null);
}
