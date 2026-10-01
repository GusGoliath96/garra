import { NextResponse } from "next/server";
import { googleAuthUrl, googleConfigured } from "@/lib/google";
import { signState } from "@/lib/integrations";
import { getCtx } from "@/lib/session";

export const dynamic = "force-dynamic";

// Botão "Conectar Google Agenda" → tela de consentimento do Google.
export async function GET(req: Request) {
  const back = (q: string) => NextResponse.redirect(new URL(`/app?${q}`, process.env.BETTER_AUTH_URL ?? req.url));
  const ctx = await getCtx();
  if (!ctx) return NextResponse.redirect(new URL("/entrar", process.env.BETTER_AUTH_URL ?? req.url));
  if (!ctx.agent || ctx.agent.status !== "ready") return back("google=erro&motivo=agente");
  if (!googleConfigured()) return back("google=erro&motivo=config");
  return NextResponse.redirect(googleAuthUrl(signState(ctx.agent.id)));
}
