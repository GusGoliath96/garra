# Plataforma multi-tenant OpenClaw — Plano

Atualizado em 2026-09-30.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Público | B2C no início, arquitetura preparada para B2B (organizações/times depois) |
| LLM | Duas opções no wizard: **login com assinatura** (Claude, ChatGPT/Codex) ou **chave de API** (Anthropic, OpenAI, OpenRouter, Gemini) |
| Canal MVP | **Só Telegram** (+ Control UI web). Wizard com tutorial do BotFather |
| Infra de testes | Servidor próprio: Proxmox, 16 GB RAM, 4 cores |
| Isolamento | 1 cell (Gateway OpenClaw completo em container) por usuário |

## Arquitetura (resumo)

- **Portal** (Next.js + TS): landing, cadastro/login, wizard, painel.
- **Control plane**: Postgres (fonte da verdade da config desejada + segredos cifrados),
  fila de jobs (pg-boss), Provisioner (`CellDriver`: Docker no MVP, K8s depois),
  Config-sync via `admin-http-rpc` (`config.patch` com `baseHash`) só na rede interna.
- **Edge**: Caddy com `forward_auth` no portal → usuário acessa a própria cell sem ver o token.
- **Broker de integrações**: OAuth Google no portal, tokens cifrados no Postgres,
  cell recebe ferramentas (MCP/HTTP), não credenciais.

## Wizard de setup

1. **LLM**
   - Assinatura: Claude ou ChatGPT → fluxo OAuth iniciado na cell, usuário abre a URL,
     autoriza e cola o código/URL de retorno no portal (fluxo headless).
   - Chave de API: provedor + chave, validada com chamada de teste.
   - Aviso no UI sobre termos de uso dos provedores no modo assinatura.
2. **Agente**: nome, personalidade, idioma, fuso, instruções → arquivos do workspace + `config.patch`.
3. **Telegram** (tutorial passo a passo, com prints):
   1. Abrir `@BotFather` → `/newbot`
   2. Escolher nome e username (terminando em `bot`)
   3. Copiar o token e colar no portal (validado via `getMe` da Bot API)
   4. Portal aplica `channels.telegram` na cell
   5. Usuário manda `/start` pro bot → recebe código de pareamento → cola no portal →
      portal aprova via RPC (assim só o dono conversa com o bot)
4. **Integrações**: "Conectar Google Agenda" (pode ficar pós-MVP).
5. **Revisão → Criar agente** (tela de progresso; health check da cell).

## Capacidade no servidor de testes

- Proxmox: criar **VM** (não LXC — Docker em LXC dá dor de cabeça) Ubuntu 24.04,
  ~12 GB RAM, 4 vCPU, 80+ GB disco. Deixa ~4 GB pro host.
- Telegram em long polling ⇒ cells **sempre ligadas** (sem scale-to-zero).
- Teto por cell 2 GB / 2 CPUs (é teto, não reserva). Uso real com Telegram ativo: **~870 MB**, picos >1 GB
  ⇒ **~10–11 usuários** na VM de 11 GB. Para escalar: reduzir plugins carregados por cell ou partir para mais hosts.

## Fases

### Fase 0 — Prova de conceito ✅ (local, 2026-09-30, OpenClaw 2026.9.7)
- [x] `openclaw fleet create` funciona (~24 s até o gateway ficar pronto)
- [x] `admin-http-rpc` habilitado por `docker exec … plugins enable` (hot reload, sem restart)
- [x] `config.get` / `config.patch` / `health` / `channels.status` via HTTP com o token da cell
- [x] Agente inteiro configurado sem terminal: modelo, persona (SOUL/USER/IDENTITY), Telegram
- [x] Login por assinatura **ChatGPT**: `models auth login --provider openai --device-code` exige TTY →
      o portal roda com TTY via Docker exec e extrai URL + código (testado até a tela da OpenAI)
- [x] Assinatura **Claude**: `claude setup-token` na máquina do usuário → `models auth paste-token` (stdin)
- [x] Chave de API: `models auth paste-api-key` via stdin (nunca por argv)
- [x] Telegram: `config.patch channels.telegram`; pareamento via `pairing list/approve` (JSON)
- [ ] Testar com bot e credenciais reais (precisa de você)
- [ ] Testar `fleet upgrade` e `fleet backup/restore`

**Achados importantes**
- **Memória é maior do que a literatura diz**: ociosa ~600–700 MB sem limite de heap.
  Com `NODE_OPTIONS=--max-old-space-size=256` cai para ~520 MB (sem OOM). Padrão adotado:
  teto 1280 MB + heap 320 MB; uso real ~620 MB. **VM de 12 GB ≈ 12–14 usuários**, não 20.
- WebSocket RPC de fora do container exige pareamento de device; o caminho simples é
  `docker exec` do CLI (loopback = confiável) + `admin-http-rpc` para config.
- Métodos WS úteis para o futuro: `models.authLogin` (wizard de login remoto), `wizard.*`,
  `channels.pairing.approve` — exigem cliente WS com `operator.admin` (device pareado).
- **Na VM (4 vCPU), 768 MB travou o provisionamento**: comandos via `docker exec` dividem o
  cgroup com o gateway (~580 MB + ~200 MB do CLI) e a cell entra em thrashing. Limite subiu
  para 1280 MB (é teto, não reserva: uso real ociosa ~620 MB).
- **Com Telegram + Claude ativos, o gateway foi morto por OOM a 1,28 GB** (anon-rss ~1 GB; o limite de
  heap não segura workers/memória nativa) → loop de restart e o OpenClaw desligou o canal
  ("crash-loop breaker"). Teto subiu para 2 GB; uso estável medido ~870 MB.
- Gravar credencial pelo CLI reinicia o container e o `doctor --fix` da partida trava o estado ~1 min;
  CLIs concorrentes nessa janela fazem o gateway falhar. Portal agora espera e evita CLI concorrente.
- `setup --baseline` cria o workspace sem onboarding; o portal remove o `BOOTSTRAP.md`.
- Primeiro remetente aprovado no Telegram vira dono (`commands.ownerAllowFrom`).
- Telegram suporta `webhookUrl` → caminho futuro para scale-to-zero.

### Fase 1 — MVP (em andamento — `portal/`)
- [x] Landing, cadastro/login (Better Auth, e-mail+senha), wizard de 3 passos, painel
- [x] Provisionamento automático no primeiro acesso, reiniciar e apagar agente
- [x] Organização como dona do agente (pronto para B2B)
- [ ] Verificação de e-mail, recuperação de senha
- [ ] Fila de jobs (hoje provisionamento roda no processo do Next)
- [ ] Limites por usuário/plano, Stripe
- [ ] Caddy + TLS na VM; backups cifrados de `/var/lib/garra`
- [ ] Acesso ao Control UI da cell pelo portal (proxy com `trusted-proxy`) — opcional
- Driver atual: `FleetDriver` (wrapper do `openclaw fleet`, já com hardening). Trocar por
  driver próprio/K8s quando o fleet limitar.

### Fase 2 — Escala
- k3s, namespace por tenant, NetworkPolicy, Stripe, observabilidade (OTel)
- Google Agenda via broker; verificação do app no Google (iniciar cedo)
- Modelo de organização (B2B)

### Fase 3 — Endurecimento
- gVisor/Kata, egress por tenant, LGPD (export/exclusão), auditoria

## Riscos

- **Login por assinatura**: funciona tecnicamente, mas os termos de consumo da Anthropic/OpenAI
  podem restringir uso em produto de terceiros → risco de bloqueio da conta do usuário.
  Manter chave de API como alternativa sempre disponível e deixar o aviso claro.
- **Fleet experimental**: CLI pode mudar sem aviso → isolar atrás do `CellDriver`.
- **Tokens OAuth em texto puro** no SQLite da cell → backups tratados como credenciais.
