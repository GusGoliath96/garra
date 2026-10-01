# Google Agenda — configuração do Google Cloud

O portal faz o OAuth do Google e guarda os tokens cifrados no Postgres. As cells recebem
só ferramentas (via MCP em `/api/mcp`), nunca as credenciais.

## 1. Projeto e API

1. Acesse https://console.cloud.google.com e crie um projeto (ex.: **Garra**).
2. **APIs e serviços → Biblioteca** → ative a **Google Calendar API**.

## 2. Tela de consentimento (Google Auth Platform)

1. **Google Auth Platform → Branding**: nome do app (**Garra**), e-mail de suporte,
   domínio autorizado `gusgoliath.com.br`.
2. **Audience (Público)**: **External**.
3. **Data access (Acesso a dados) → Adicionar escopos**:
   - `openid`, `.../auth/userinfo.email`
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.readonly`

## 3. Credencial OAuth

**Clients → Create client → Web application**

- **Authorized redirect URIs**:
  - `https://ia.gusgoliath.com.br/api/integrations/google/callback`
  - `http://localhost:3000/api/integrations/google/callback` (desenvolvimento)

Guarde o **Client ID** e o **Client secret**.

## 4. Colocar as credenciais na VM

```bash
ssh -t garra-vm 'cd ~/garra && bash deploy/set-google.sh'
```

O script pede o Client ID e o secret (o secret não aparece na tela) e reinicia o portal.

## 5. Teste × produção (importante)

| Modo | Quem pode conectar | Validade do acesso |
|---|---|---|
| **Testing** | Só e-mails cadastrados em *Audience → Test users* (até 100) | **Expira a cada 7 dias** — o usuário precisa reconectar |
| **In production, não verificado** | Qualquer conta, até 100 usuários; o Google mostra o aviso "app não verificado" | Não expira |
| **In production, verificado** | Sem limite, sem aviso | Não expira |

Os escopos de agenda são **sensíveis**: a verificação do Google exige página inicial,
**política de privacidade** pública, domínio verificado e um vídeo mostrando o uso.
Leva semanas — vale começar cedo. Para os primeiros testadores, publique como
"In production" sem verificação (eles clicam em "Avançado → acessar Garra").
