// Validação do token do bot direto na Bot API do Telegram.

const TOKEN_RE = /^\d{5,15}:[A-Za-z0-9_-]{30,}$/;

export async function getBotInfo(
  token: string,
): Promise<{ ok: true; username: string; name: string } | { ok: false; reason: string }> {
  const t = token.trim();
  if (!TOKEN_RE.test(t)) {
    return { ok: false, reason: "Formato inválido. O token parece com 123456789:AAH…" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${t}/getMe`, { signal: AbortSignal.timeout(10_000) });
    const body = (await res.json()) as { ok: boolean; result?: { username: string; first_name: string } };
    if (!body.ok || !body.result) return { ok: false, reason: "O Telegram recusou esse token." };
    return { ok: true, username: body.result.username, name: body.result.first_name };
  } catch {
    return { ok: false, reason: "Não foi possível falar com o Telegram agora." };
  }
}
