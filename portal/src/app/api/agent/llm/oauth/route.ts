import { getOAuthSession, publicOAuth, startDeviceLogin } from "@/lib/agents";
import { isProviderId, PROVIDERS } from "@/lib/llm";
import { HttpError, readJson, requireReadyAgent, route } from "@/lib/session";

export const dynamic = "force-dynamic";

// Inicia login por assinatura (device-code): devolve URL + código para o usuário digitar.
export const POST = route(async (ctx, req) => {
  const agent = requireReadyAgent(ctx);
  const body = await readJson<{ provider?: string }>(req);
  if (!isProviderId(body.provider) || PROVIDERS[body.provider].subscription?.kind !== "device_code") {
    throw new HttpError(400, "Esse provedor não suporta login por código.");
  }
  const session = await startDeviceLogin(agent, body.provider);
  return { oauth: publicOAuth(session) };
});

export const GET = route(async (ctx) => {
  if (!ctx.agent) throw new HttpError(404, "Nenhum agente.");
  return { oauth: publicOAuth(getOAuthSession(ctx.agent.id)) };
});
