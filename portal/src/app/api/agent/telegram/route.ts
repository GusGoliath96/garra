import { setTelegram, skipTelegram } from "@/lib/agents";
import { HttpError, readJson, requireReadyAgent, route } from "@/lib/session";
import { getBotInfo } from "@/lib/telegram";

export const POST = route(async (ctx, req) => {
  const agent = requireReadyAgent(ctx);
  const body = await readJson<{ token?: string; skip?: boolean }>(req);
  if (body.skip) {
    await skipTelegram(agent);
    return { ok: true };
  }
  if (!body.token) throw new HttpError(400, "Cole o token do bot.");
  const bot = await getBotInfo(body.token);
  if (!bot.ok) throw new HttpError(422, bot.reason);
  await setTelegram(agent, body.token, bot.username);
  return { ok: true, bot: { username: bot.username, name: bot.name } };
});
