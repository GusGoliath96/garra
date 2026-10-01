import { agentHealth, deleteAgent, getOAuthSession, publicOAuth, startProvisioning, toPublic } from "@/lib/agents";
import { HttpError, route } from "@/lib/session";

export const dynamic = "force-dynamic";

// Estado do agente do usuário (o wizard e o painel fazem polling aqui).
export const GET = route(async (ctx) => {
  if (!ctx.agent) return { agent: null };
  const health = ctx.agent.status === "ready" && ctx.agent.setup_step === "done"
    ? await agentHealth(ctx.agent)
    : null;
  return { agent: toPublic(ctx.agent), health, oauth: publicOAuth(getOAuthSession(ctx.agent.id)) };
});

// Cria (ou tenta de novo) o agente do usuário.
export const POST = route(async (ctx) => {
  const agent = await startProvisioning(ctx.orgId);
  return { agent: toPublic(agent) };
});

export const DELETE = route(async (ctx) => {
  if (!ctx.agent) throw new HttpError(404, "Nenhum agente.");
  await deleteAgent(ctx.agent);
  return { ok: true };
});
