// Verifica se o `claude setup-token` dentro da cell gera o link de login: npx tsx scripts/smoke-claude.mts <tenant>
import { FleetDriver } from "../src/lib/cells/fleet-driver";

const d = new FleetDriver();
const proc = await d.claudeInteractive(process.argv[2], ["setup-token"]);
const until = Date.now() + 30_000;
let url: string | undefined;
while (!url && Date.now() < until) {
  const flat = proc.output().replace(/\n(?=[A-Za-z0-9%&=_.~-])/g, "");
  url = flat.match(/https:\/\/claude\.(?:ai|com)\/[^\s]*oauth\/authorize\?[^\s]+/)?.[0];
  await new Promise((r) => setTimeout(r, 300));
}
console.log(url ? `URL ok (${url.length} chars): ${url.slice(0, 90)}…` : `SEM URL. Saída:\n${proc.output().slice(-800)}`);
console.log("termina com state=:", /state=[A-Za-z0-9_-]+$/.test(url ?? ""));
// Código longo como o real (~100 chars): texto e Enter em escritas separadas.
const fake = "A".repeat(60) + "#" + "b".repeat(43);
proc.write(fake);
await new Promise((r) => setTimeout(r, 800));
proc.write("\r");
await new Promise((r) => setTimeout(r, 8000));
console.log("após código inválido:", proc.output().slice(-300).replace(/\s+/g, " "));
proc.kill();
process.exit(0);
