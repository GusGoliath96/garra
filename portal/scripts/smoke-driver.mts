// Teste rápido do driver contra uma cell existente: npx tsx --env-file=.env.local scripts/smoke-driver.ts <tenant> <token>
import { FleetDriver } from "../src/lib/cells/fleet-driver";
import { GatewayClient } from "../src/lib/cells/gateway";

const [tenant, token, port] = process.argv.slice(2);
const d = new FleetDriver();
console.log("state:", await d.state(tenant));
const r = await d.openclaw(tenant, ["--version"]);
console.log("version:", r.exitCode, r.output.trim().split("\n").pop());
await d.writeFile(tenant, "/home/node/.openclaw/workspace/TESTE.md", "olá\nmundo\n");
console.log("cat:", (await d.openclaw(tenant, ["--version"])).exitCode, (await d.exec(tenant, ["cat", "/home/node/.openclaw/workspace/TESTE.md"], {})).output);
const gw = new GatewayClient(d.gatewayUrl(Number(port)), token);
console.log("health ok:", (await gw.health()).ok);
console.log("patch:", JSON.stringify(await gw.configPatch({ agents: { defaults: { userTimezone: "America/Sao_Paulo" } } })).slice(0, 200));
const cfg = await gw.configGet();
console.log("tz in raw:", cfg.raw.includes("America/Sao_Paulo"));
