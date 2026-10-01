import { NextResponse } from "next/server";
import { connectGoogle, verifyState } from "@/lib/integrations";
import { getCtx } from "@/lib/session";

export const dynamic = "force-dynamic";

// Retorno do Google: valida o state (amarrado ao agente do usuário logado) e conecta.
export async function GET(req: Request) {
  const base = process.env.BETTER_AUTH_URL ?? req.url;
  const back = (q: string) => NextResponse.redirect(new URL(`/app?${q}`, base));
  const url = new URL(req.url);
  if (url.searchParams.get("error")) return back("google=cancelado");

  const ctx = await getCtx();
  if (!ctx) return NextResponse.redirect(new URL("/entrar", base));
  const agentId = verifyState(url.searchParams.get("state") ?? "");
  const code = url.searchParams.get("code");
  if (!agentId || !ctx.agent || agentId !== ctx.agent.id || !code) return back("google=erro&motivo=state");

  try {
    await connectGoogle(ctx.agent, code);
    return back("google=ok");
  } catch (e) {
    console.error("google connect failed", e);
    const msg = e instanceof Error ? e.message : "erro";
    return back(`google=erro&motivo=${encodeURIComponent(msg.slice(0, 200))}`);
  }
}
