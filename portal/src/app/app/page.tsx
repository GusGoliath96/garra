import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard/dashboard";
import { toPublic } from "@/lib/agents";
import { getCtx } from "@/lib/session";

export const metadata = { title: "Painel — Garra" };

export default async function AppPage() {
  const ctx = await getCtx();
  if (!ctx) redirect("/entrar");
  if (!ctx.agent || ctx.agent.setup_step !== "done") redirect("/app/setup");
  return <Dashboard initial={JSON.parse(JSON.stringify(toPublic(ctx.agent)))} userName={ctx.user.name} />;
}
