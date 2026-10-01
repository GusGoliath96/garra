// Aplica config de Telegram com token falso numa cell de teste e confere a saúde do canal.
import { FleetDriver } from "../src/lib/cells/fleet-driver";
import { GatewayClient } from "../src/lib/cells/gateway";

const [tenant, token, port] = process.argv.slice(2);
const d = new FleetDriver();
const gw = new GatewayClient(d.gatewayUrl(Number(port)), token);
await gw.configPatch({ channels: { telegram: { enabled: true, botToken: "123456789:AAFakeTokenFakeTokenFakeTokenFake12", dmPolicy: "pairing" } } });
await new Promise((r) => setTimeout(r, 8000));
const st = await gw.call("channels.status");
console.log(JSON.stringify(st).slice(0, 900));
const p = await d.openclaw(tenant, ["pairing", "list", "telegram", "--json"]);
console.log("pairing:", p.exitCode, p.output.slice(-400));
