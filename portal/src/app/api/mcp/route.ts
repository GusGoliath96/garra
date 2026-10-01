// Servidor MCP (Streamable HTTP, sem sessão) que entrega à cell as ferramentas das integrações.
// Autenticação: Bearer com o token MCP do agente (só o hash fica no banco).
import { NextResponse } from "next/server";
import { agentByMcpToken } from "@/lib/integrations";
import { CALENDAR_TOOLS, callCalendarTool, ToolInputError } from "@/lib/mcp/calendar";
import { logEvent } from "@/lib/agents";

export const dynamic = "force-dynamic";

const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const rpcResult = (id: RpcRequest["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const rpcError = (id: RpcRequest["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const agent = token ? await agentByMcpToken(token) : null;
  if (!agent) return NextResponse.json(rpcError(null, -32001, "Não autorizado."), { status: 401 });

  let body: RpcRequest | RpcRequest[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "JSON inválido."), { status: 400 });
  }

  const handle = async (msg: RpcRequest) => {
    // Notificações (sem id) não têm resposta.
    if (msg.id === undefined || msg.id === null) return null;
    switch (msg.method) {
      case "initialize": {
        const requested = String(msg.params?.protocolVersion ?? "");
        return rpcResult(msg.id, {
          protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "garra-integracoes", version: "1.0.0" },
          instructions:
            "Ferramentas do Google Agenda do dono. Horários sem fuso são interpretados no fuso do dono. Confirme antes de criar, remarcar ou cancelar quando houver dúvida.",
        });
      }
      case "ping":
        return rpcResult(msg.id, {});
      case "tools/list":
        return rpcResult(msg.id, { tools: CALENDAR_TOOLS });
      case "tools/call": {
        const name = String(msg.params?.name ?? "");
        const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
        if (!CALENDAR_TOOLS.some((t) => t.name === name)) return rpcError(msg.id, -32602, `Ferramenta desconhecida: ${name}`);
        try {
          const text = await callCalendarTool(agent, name, args);
          void logEvent(agent.id, "tool_call", { tool: name }).catch(() => null);
          return rpcResult(msg.id, { content: [{ type: "text", text }] });
        } catch (e) {
          const text = e instanceof ToolInputError ? e.message : "Falha ao falar com o Google Agenda. Tente de novo em instantes.";
          if (!(e instanceof ToolInputError)) console.error("mcp tool error", name, e);
          return rpcResult(msg.id, { content: [{ type: "text", text }], isError: true });
        }
      }
      default:
        return rpcError(msg.id, -32601, `Método não suportado: ${msg.method}`);
    }
  };

  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handle))).filter(Boolean);
    return out.length ? NextResponse.json(out) : new Response(null, { status: 202 });
  }
  const out = await handle(body);
  return out ? NextResponse.json(out) : new Response(null, { status: 202 });
}

// Sem stream iniciado pelo servidor nem sessões.
export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
