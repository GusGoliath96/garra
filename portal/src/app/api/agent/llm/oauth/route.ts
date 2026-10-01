import { getOAuthSession, publicOAuth, startClaudeLogin, startDeviceLogin, submitClaudeCode } from "@/lib/agents";
import { isProviderId, PROVIDERS } from "@/lib/llm";
import { HttpError, readJson, requireReadyAgent, route } from "@/lib/session";

export const dynamic = "force-dynamic";

// Inicia login por assinatura:
// - ChatGPT (device-code): devolve URL + código para o usuário digitar na OpenAI.
// - Claude: devolve o link do claude.ai; depois o usuário manda o código com { code }.
export const POST = route(async (ctx, req) => {
  const agent = requireReadyAgent(ctx);
  const body = await readJson<{ provider?: string; code?: string }>(req);
  if (!isProviderId(body.provider)) throw new HttpError(400, "Provedor inválido.");
  const kind = PROVIDERS[body.provider].subscription?.kind;
  if (kind === "device_code") return { oauth: publicOAuth(await startDeviceLogin(agent, body.provider)) };
  if (kind === "claude_code") {
    if (body.code) {
      if (body.code.length > 500) throw new HttpError(400, "Código inválido.");
      return { oauth: publicOAuth(await submitClaudeCode(agent, body.code)) };
    }
    return { oauth: publicOAuth(await startClaudeLogin(agent)) };
  }
  throw new HttpError(400, "Esse provedor não tem login por assinatura.");
});

export const GET = route(async (ctx) => {
  if (!ctx.agent) throw new HttpError(404, "Nenhum agente.");
  return { oauth: publicOAuth(getOAuthSession(ctx.agent.id)) };
});
