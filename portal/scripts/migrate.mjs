// Migrações: tabelas do Better Auth + schema do domínio (organizações, agentes, eventos).
// Uso: npm run db:migrate
import pg from "pg";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const auth = betterAuth({ database: pool, emailAndPassword: { enabled: true } });
const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);
if (toBeCreated.length || toBeAdded.length) {
  console.log("better-auth:", toBeCreated.map((t) => t.table), toBeAdded.map((t) => t.table));
  await runMigrations();
}

// Organização é a dona do agente desde o início: no B2C cada usuário tem a sua,
// no B2B várias pessoas entram na mesma organização.
await pool.query(`
  CREATE TABLE IF NOT EXISTS organization (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    kind        text NOT NULL DEFAULT 'personal' CHECK (kind IN ('personal', 'business')),
    created_at  timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS organization_member (
    organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    user_id         text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role            text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS agent (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    tenant             text NOT NULL UNIQUE,
    status             text NOT NULL DEFAULT 'provisioning'
                       CHECK (status IN ('provisioning', 'ready', 'error', 'stopped', 'deleting')),
    status_detail      text,
    port               integer,
    gateway_token_enc  text,
    setup_step         text NOT NULL DEFAULT 'llm'
                       CHECK (setup_step IN ('llm', 'persona', 'telegram', 'done')),
    llm_provider       text,
    llm_mode           text CHECK (llm_mode IN ('api_key', 'subscription')),
    llm_model          text,
    name               text,
    emoji              text,
    persona            jsonb NOT NULL DEFAULT '{}'::jsonb,
    telegram_bot       text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS agent_org_idx ON agent(organization_id);

  CREATE TABLE IF NOT EXISTS agent_event (
    id          bigserial PRIMARY KEY,
    agent_id    uuid NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
    type        text NOT NULL,
    data        jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS agent_event_agent_idx ON agent_event(agent_id, created_at DESC);
`);

// Integrações (Google Agenda, Gmail…): credenciais ficam aqui, cifradas — nunca na cell.
// A cell acessa via servidor MCP do portal, autenticada por um token próprio do agente.
await pool.query(`
  ALTER TABLE agent ADD COLUMN IF NOT EXISTS mcp_token_hash text;
  CREATE UNIQUE INDEX IF NOT EXISTS agent_mcp_token_idx ON agent(mcp_token_hash);

  CREATE TABLE IF NOT EXISTS integration (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id           uuid NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
    provider           text NOT NULL CHECK (provider IN ('google')),
    account_email      text,
    scopes             text NOT NULL DEFAULT '',
    refresh_token_enc  text NOT NULL,
    access_token_enc   text,
    access_expires_at  timestamptz,
    status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error')),
    status_detail      text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    UNIQUE (agent_id, provider)
  );
`);

console.log("migrações aplicadas");
await pool.end();
