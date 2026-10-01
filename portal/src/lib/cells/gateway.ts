// Cliente do plugin admin-http-rpc da cell (POST /api/v1/admin/rpc).
// Só alcançável pelo portal: a porta da cell é publicada em 127.0.0.1.

export class GatewayRpcError extends Error {
  constructor(
    public method: string,
    public code: string,
    message: string,
  ) {
    super(`${method}: ${message}`);
  }
}

export class GatewayClient {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

  async call<T = unknown>(method: string, params: Record<string, unknown> = {}, timeoutMs = 20_000): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/v1/admin/rpc`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ method, params }),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => null)) as
      | { ok: boolean; payload?: T; error?: { code?: string; message?: string } }
      | null;
    if (!body) throw new GatewayRpcError(method, `HTTP_${res.status}`, "resposta inválida");
    if (!body.ok) throw new GatewayRpcError(method, body.error?.code ?? "ERROR", body.error?.message ?? "erro");
    return body.payload as T;
  }

  health() {
    return this.call<{ ok: boolean; channels: Record<string, unknown>; agents: unknown[] }>("health");
  }

  async configGet() {
    return this.call<{ hash: string; raw: string; config?: Record<string, unknown> }>("config.get");
  }

  /**
   * JSON merge patch na config (objetos mesclam, null apaga).
   * Usa o hash atual como guarda de concorrência; tenta de novo uma vez se mudou no meio.
   */
  async configPatch(patch: Record<string, unknown>, replacePaths?: string[]) {
    for (let attempt = 0; ; attempt++) {
      const { hash } = await this.configGet();
      try {
        return await this.call("config.patch", {
          raw: JSON.stringify(patch),
          baseHash: hash,
          ...(replacePaths ? { replacePaths } : {}),
        });
      } catch (e) {
        if (attempt === 0 && e instanceof GatewayRpcError && /hash|conflict|stale/i.test(e.message)) continue;
        throw e;
      }
    }
  }
}
