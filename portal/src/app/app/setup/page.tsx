import { redirect } from "next/navigation";
import { SetupWizard } from "@/components/setup/wizard";
import { toPublic } from "@/lib/agents";
import { getCtx } from "@/lib/session";

export const metadata = { title: "Configurar assistente — Garra" };

export default async function SetupPage() {
  const ctx = await getCtx();
  if (!ctx) redirect("/entrar");
  if (ctx.agent?.setup_step === "done") redirect("/app");
  const initial = ctx.agent ? JSON.parse(JSON.stringify(toPublic(ctx.agent))) : null;
  return <SetupWizard initial={initial} userName={ctx.user.name} />;
}
