// Liga uma cell de teste ao MCP do portal local (sem Google) e confere o fluxo.
// Uso: npx tsx --env-file=.env.local scripts/smoke-mcp.mts <tenant> <porta> <token-gateway> <url-mcp>
import { randomBytes } from "node:crypto";
import { pool, query, queryOne } from "../src/lib/db";
import { encrypt } from "../src/lib/crypto";
import { hashMcpToken } from "../src/lib/integrations";
import { GatewayClient } from "../src/lib/cells/gateway";

const [tenant, port, gwToken, mcpUrl] = process.argv.slice(2);
const org = await queryOne<{ id: string }>(`INSERT INTO organization (name) VALUES ('smoke-mcp') RETURNING id`);
const mcpToken = `gmcp_${randomBytes(24).toString("base64url")}`;
await query(
  `INSERT INTO agent (organization_id, tenant, status, port, gateway_token_enc, setup_step, mcp_token_hash, persona)
   VALUES ($1, $2, 'ready', $3, $4, 'done', $5, '{"timezone":"America/Sao_Paulo"}')`,
  [org!.id, tenant, Number(port), encrypt(gwToken), hashMcpToken(mcpToken)],
);
const gw = new GatewayClient(`http://127.0.0.1:${port}`, gwToken);
await gw.configPatch({
  mcp: { servers: { google_agenda: { url: mcpUrl, transport: "streamable-http", enabled: true, headers: { Authorization: `Bearer ${mcpToken}` } } } },
});
console.log("cell configurada; token MCP gerado");
// tools/call direto (mesmo caminho que a cell usa)
const r = await fetch(mcpUrl.replace("172.21.0.1", "127.0.0.1"), {
  method: "POST",
  headers: { Authorization: `Bearer ${mcpToken}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "agenda_listar_eventos", arguments: {} } }),
});
console.log("tools/call:", r.status, JSON.stringify(await r.json()));
const bad = await fetch(mcpUrl.replace("172.21.0.1", "127.0.0.1"), { method: "POST", headers: { Authorization: "Bearer errado" }, body: "{}" });
console.log("token inválido ->", bad.status);
await pool.end();
