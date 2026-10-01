// Recria o container de uma cell com os limites/ambiente atuais do .env (memória, CPU, heap),
// preservando dados, porta e token do gateway. Útil quando um limite antigo ficou gravado no container.
// Uso (na VM): npx tsx --env-file=.env.local scripts/recreate-cell.mts <tenant>
import { execFileSync } from "node:child_process";
import { pool, queryOne } from "../src/lib/db";
import { decrypt } from "../src/lib/crypto";

const tenant = process.argv[2];
if (!tenant) throw new Error("uso: recreate-cell.mts <tenant>");
const agent = await queryOne<{ port: number; gateway_token_enc: string }>(
  `SELECT port, gateway_token_enc FROM agent WHERE tenant = $1`,
  [tenant],
);
if (!agent?.port || !agent.gateway_token_enc) throw new Error(`agente ${tenant} não encontrado ou sem cell`);

const bin = process.env.OPENCLAW_BIN ?? "openclaw";
const env = { ...process.env, OPENCLAW_STATE_DIR: process.env.OPENCLAW_STATE_DIR ?? "" };
const heap = process.env.CELL_NODE_HEAP_MB ?? "1024";

// Sem --purge-data: o estado da cell (config, memória, credenciais) fica no disco.
execFileSync(bin, ["fleet", "rm", tenant, "--force"], { env, stdio: "inherit" });
// O erro do execFileSync inclui o comando (com o token): não deixar vazar no log.
try {
  execFileSync(
  bin,
  [
    "fleet", "create", tenant, "--json",
    "--port", String(agent.port),
    "--gateway-token", decrypt(agent.gateway_token_enc),
    "--image", process.env.OPENCLAW_IMAGE ?? "ghcr.io/openclaw/openclaw:latest",
    "--memory", process.env.CELL_MEMORY ?? "2g",
    "--cpus", process.env.CELL_CPUS ?? "2",
    "--env", `NODE_OPTIONS=--max-old-space-size=${heap}`,
  ],
  { env, stdio: ["ignore", "ignore", "inherit"] },
  );
} catch {
  // `fleet create` falha se o health check estourar o prazo (ex.: lease antigo ainda ativo),
  // mas o container fica criado e sobe sozinho. Confira com `openclaw fleet status`.
  console.error(`fleet create retornou erro para ${tenant}; verifique com: openclaw fleet status ${tenant}`);
}
console.log(`cell ${tenant} recriada (porta ${agent.port}, heap ${heap} MB)`);
await pool.end();
