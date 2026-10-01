import { approvePairing, listPairing } from "@/lib/agents";
import { HttpError, readJson, requireReadyAgent, route } from "@/lib/session";

export const dynamic = "force-dynamic";

// Pedidos de conversa pendentes (quem mandou /start pro bot).
export const GET = route(async (ctx) => {
  const agent = requireReadyAgent(ctx);
  if (!agent.telegram_bot) return { requests: [] };
  return { requests: await listPairing(agent) };
});

export const POST = route(async (ctx, req) => {
  const agent = requireReadyAgent(ctx);
  const { code } = await readJson<{ code?: string }>(req);
  if (!code) throw new HttpError(400, "Código ausente.");
  await approvePairing(agent, code.trim().toUpperCase());
  return { ok: true };
});
