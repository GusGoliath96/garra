import { setLlmCredential } from "@/lib/agents";
import { isProviderId, PROVIDERS, validateCredential, type LlmMode } from "@/lib/llm";
import { HttpError, readJson, requireReadyAgent, route } from "@/lib/session";

// Chave de API, ou token de assinatura Claude colado manualmente (opção avançada).
export const POST = route(async (ctx, req) => {
  const agent = requireReadyAgent(ctx);
  const body = await readJson<{ provider?: string; mode?: LlmMode; secret?: string }>(req);
  if (!isProviderId(body.provider)) throw new HttpError(400, "Provedor inválido.");
  const mode: LlmMode = body.mode === "subscription" ? "subscription" : "api_key";
  const info = PROVIDERS[body.provider];
  // Assinatura colada à mão só para Claude (token de `claude setup-token`, opção avançada).
  if (mode === "subscription" && body.provider !== "anthropic") {
    throw new HttpError(400, "Esse provedor usa login pelo navegador.");
  }
  if (mode === "api_key" && !info.apiKey) throw new HttpError(400, "Esse provedor não aceita chave de API.");
  if (!body.secret) throw new HttpError(400, "Informe a credencial.");

  const check = await validateCredential(body.provider, mode, body.secret);
  if (!check.ok) throw new HttpError(422, check.reason);
  await setLlmCredential(agent, body.provider, mode, body.secret);
  return { ok: true };
});
