// Catálogo de provedores de LLM oferecidos no wizard e validação de credenciais.

export type LlmMode = "api_key" | "subscription";

export type ProviderId = "anthropic" | "openai" | "openrouter";

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  /** Modelo padrão caso o catálogo da cell não traga nada após a autenticação. */
  defaultModel: string;
  apiKey?: { placeholder: string; helpUrl: string };
  /** Como funciona o login por assinatura deste provedor. */
  subscription?: { kind: "device_code" | "setup_token"; label: string };
};

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  anthropic: {
    id: "anthropic",
    label: "Claude (Anthropic)",
    defaultModel: "anthropic/claude-sonnet-5",
    apiKey: { placeholder: "sk-ant-api03-…", helpUrl: "https://console.anthropic.com/settings/keys" },
    subscription: { kind: "setup_token", label: "Assinatura Claude Pro/Max" },
  },
  openai: {
    id: "openai",
    label: "ChatGPT (OpenAI)",
    defaultModel: "openai/gpt-6-astra",
    apiKey: { placeholder: "sk-proj-…", helpUrl: "https://platform.openai.com/api-keys" },
    subscription: { kind: "device_code", label: "Assinatura ChatGPT Plus/Pro" },
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter (vários modelos)",
    defaultModel: "openrouter/anthropic/claude-sonnet-5",
    apiKey: { placeholder: "sk-or-v1-…", helpUrl: "https://openrouter.ai/settings/keys" },
  },
};

export function isProviderId(v: unknown): v is ProviderId {
  return typeof v === "string" && v in PROVIDERS;
}

/** Testa a credencial direto no provedor antes de gravar na cell. */
export async function validateCredential(
  provider: ProviderId,
  mode: LlmMode,
  secret: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const s = secret.trim();
  if (s.length < 10) return { ok: false, reason: "Credencial muito curta." };
  // Só em dev: permite testar o fluxo inteiro com credenciais falsas.
  if (process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_LLM_VALIDATION === "1") return { ok: true };
  const timeout = AbortSignal.timeout(10_000);
  try {
    if (provider === "anthropic" && mode === "subscription") {
      // Token gerado por `claude setup-token`. Não há endpoint público para testar sem gastar
      // quota; checamos o formato e a cell valida no primeiro uso.
      return s.startsWith("sk-ant-oat")
        ? { ok: true }
        : { ok: false, reason: "Esse não parece um token do `claude setup-token` (começa com sk-ant-oat)." };
    }
    let res: Response;
    if (provider === "anthropic") {
      res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
        headers: { "x-api-key": s, "anthropic-version": "2023-06-01" },
        signal: timeout,
      });
    } else if (provider === "openai") {
      res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${s}` },
        signal: timeout,
      });
    } else {
      res = await fetch("https://openrouter.ai/api/v1/key", {
        headers: { Authorization: `Bearer ${s}` },
        signal: timeout,
      });
    }
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "Chave recusada pelo provedor." };
    return { ok: false, reason: `O provedor respondeu HTTP ${res.status}. Tente novamente.` };
  } catch {
    return { ok: false, reason: "Não foi possível falar com o provedor agora." };
  }
}
