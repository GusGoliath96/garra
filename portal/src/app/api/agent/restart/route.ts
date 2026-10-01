import { restartAgent } from "@/lib/agents";
import { requireReadyAgent, route } from "@/lib/session";

export const POST = route(async (ctx) => {
  await restartAgent(requireReadyAgent(ctx));
  return { ok: true };
});
