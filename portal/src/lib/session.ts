import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "./auth";
import { ensurePersonalOrg, getAgentForOrg, type AgentRow } from "./agents";

export async function getUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export type Ctx = {
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>;
  orgId: string;
  agent: AgentRow | null;
};

export async function getCtx(): Promise<Ctx | null> {
  const user = await getUser();
  if (!user) return null;
  const orgId = await ensurePersonalOrg(user);
  const agent = await getAgentForOrg(orgId);
  return { user, orgId, agent };
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Wrapper das rotas de API: autentica, trata erros e devolve JSON. */
export function route<T>(handler: (ctx: Ctx, req: Request) => Promise<T>) {
  return async (req: Request) => {
    try {
      const ctx = await getCtx();
      if (!ctx) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
      return NextResponse.json(await handler(ctx, req));
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: e instanceof Error ? e.message : "Erro inesperado." }, { status: 500 });
    }
  };
}

export function requireReadyAgent(ctx: Ctx): AgentRow {
  if (!ctx.agent) throw new HttpError(409, "Seu agente ainda não foi criado.");
  if (ctx.agent.status !== "ready") throw new HttpError(409, "Seu agente ainda está sendo preparado.");
  return ctx.agent;
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "JSON inválido.");
  }
}
