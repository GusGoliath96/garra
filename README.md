# Garra — agentes OpenClaw hospedados (um por usuário)

Portal onde a pessoa se cadastra, conecta a IA (assinatura ChatGPT/Claude ou chave de API),
define a personalidade e conversa com a assistente pelo Telegram. Cada usuário ganha uma
**cell**: um Gateway OpenClaw completo, isolado em container (via `openclaw fleet`).

Plano, decisões e achados da Fase 0: [PLANO.md](PLANO.md).

## Estrutura

```
docker-compose.yml        Postgres do portal (127.0.0.1:55433)
portal/                   Next.js 16: landing, cadastro, wizard, painel, API
  src/lib/cells/          CellDriver (FleetDriver) + cliente do admin-http-rpc
  src/lib/agents.ts       provisionar, LLM, persona, Telegram, pareamento
  scripts/migrate.mjs     tabelas do Better Auth + domínio
poc/                      OpenClaw CLI local (fleet) e estado das cells em dev
deploy/                   setup da VM (Proxmox), unit systemd, Caddyfile
```

## Rodar local

Pré-requisitos: Docker, Node 24, imagem `ghcr.io/openclaw/openclaw:latest`.

```bash
docker compose up -d
cd poc && npm install && cd ..
cd portal && npm install && npm run db:migrate && npm run dev
```

Abra http://localhost:3000, crie uma conta e siga o wizard. Configure `portal/.env.local`
a partir do `.env.example` (gere `BETTER_AUTH_SECRET` e `APP_SECRET_KEY` com
`openssl rand -base64 32`). Em dev, `DEV_SKIP_LLM_VALIDATION=1` aceita credenciais falsas.

## Subir na VM (Proxmox)

VM Ubuntu 24.04, ~12 GB RAM, 4 vCPU, 80 GB. Clone e rode o setup como o
usuário UID 1000:

```bash
ssh usuario@IP-DA-VM 'git clone https://github.com/GusGoliath96/garra.git ~/garra && cd ~/garra && bash deploy/setup-vm.sh'
```

Atualizações seguintes (a VM é um clone deste repositório):

```bash
ssh usuario@IP-DA-VM 'cd ~/garra && bash deploy/update.sh'
```

## Como funciona

1. Primeiro acesso → `fleet create u-<id>` (768 MB, heap 320 MB, 1 CPU, porta só em 127.0.0.1)
   → habilita `admin-http-rpc` → `setup --baseline`. O token do gateway é guardado cifrado (AES-GCM).
2. LLM → `models auth paste-api-key|paste-token` via stdin, ou device-code com TTY (ChatGPT);
   depois `models set` e restart do gateway.
3. Persona → grava `SOUL.md`, `USER.md`, `IDENTITY.md` no workspace + `config.patch` (identidade, fuso).
4. Telegram → valida token com `getMe`, `config.patch channels.telegram` (`dmPolicy: pairing`),
   lista pedidos (`pairing list --json`) e aprova o dono (`pairing approve --notify`).

Credenciais de LLM e token do bot ficam **só na cell**; o portal guarda apenas o token do gateway.

## Integrações (Google Agenda)

O OAuth do Google acontece no portal; os tokens ficam cifrados no Postgres (`integration`).
A cell recebe as ferramentas por um servidor MCP do portal (`/api/mcp`, Streamable HTTP),
autenticada com um token por agente (só o hash fica no banco). Ferramentas:
`agenda_listar_eventos`, `agenda_criar_evento`, `agenda_atualizar_evento`,
`agenda_cancelar_evento`, `agenda_horarios_livres`. Configuração do Google Cloud:
[deploy/GOOGLE.md](deploy/GOOGLE.md).
