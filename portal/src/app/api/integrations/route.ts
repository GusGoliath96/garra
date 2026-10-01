import { disconnectGoogle, listIntegrations } from "@/lib/integrations";
import { googleConfigured } from "@/lib/google";
import { HttpError, requireReadyAgent, route } from "@/lib/session";

export const dynamic = "force-dynamic";

export const GET = route(async (ctx) => {
  if (!ctx.agent) return { integrations: [], google: { available: googleConfigured() } };
  return { integrations: await listIntegrations(ctx.agent.id), google: { available: googleConfigured() } };
});

export const DELETE = route(async (ctx, req) => {
  const agent = requireReadyAgent(ctx);
  const provider = new URL(req.url).searchParams.get("provider");
  if (provider !== "google") throw new HttpError(400, "Integração inválida.");
  await disconnectGoogle(agent);
  return { ok: true };
});
