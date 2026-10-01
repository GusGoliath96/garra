import { execFile } from "node:child_process";
import { PassThrough } from "node:stream";
import { promisify } from "node:util";
import Docker from "dockerode";
import type { CellDriver, CreatedCell, ExecOptions, ExecResult, InteractiveExec } from "./driver";

const execFileAsync = promisify(execFile);

const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(\x07|\x1b\\)|\r/g;
export const stripAnsi = (s: string) => s.replace(ANSI, "");

// O stream pode fechar antes do Docker registrar o código de saída.
async function waitExit(exec: Docker.Exec, timeoutMs = 10_000): Promise<number> {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const info = await exec.inspect();
    if (!info.Running && info.ExitCode !== null) return info.ExitCode;
    if (Date.now() > until) return -1;
    await new Promise((r) => setTimeout(r, 100));
  }
}

const OPENCLAW_ENTRY = ["node", "/app/dist/index.js"];

export class FleetDriver implements CellDriver {
  private docker = new Docker();
  private bin = process.env.OPENCLAW_BIN ?? "openclaw";
  private env = {
    ...process.env,
    OPENCLAW_STATE_DIR: process.env.OPENCLAW_STATE_DIR ?? "",
  };

  private container(tenant: string) {
    return this.docker.getContainer(`openclaw-cell-${tenant}`);
  }

  private async fleet(args: string[], timeoutMs = 180_000) {
    const { stdout } = await execFileAsync(this.bin, ["fleet", ...args], {
      env: this.env,
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
    });
    return stdout;
  }

  async create(tenant: string): Promise<CreatedCell> {
    const heap = process.env.CELL_NODE_HEAP_MB ?? "320";
    const stdout = await this.fleet([
      "create",
      tenant,
      "--json",
      "--image", process.env.OPENCLAW_IMAGE ?? "ghcr.io/openclaw/openclaw:latest",
      "--memory", process.env.CELL_MEMORY ?? "1280m",
      "--cpus", process.env.CELL_CPUS ?? "1",
      "--env", `NODE_OPTIONS=--max-old-space-size=${heap}`,
    ]);
    // O CLI imprime um banner antes do JSON.
    const json = JSON.parse(stdout.slice(stdout.indexOf("{")));
    return { tenant: json.tenant, port: json.port, token: json.token };
  }

  async remove(tenant: string, { purgeData }: { purgeData: boolean }) {
    await this.fleet(["rm", tenant, "--force", ...(purgeData ? ["--purge-data"] : [])]);
  }

  async restart(tenant: string) {
    await this.fleet(["restart", tenant]);
  }

  async state(tenant: string) {
    try {
      const info = await this.container(tenant).inspect();
      return info.State.Running ? ("running" as const) : ("stopped" as const);
    } catch {
      return "missing" as const;
    }
  }

  async openclaw(tenant: string, args: string[], opts: ExecOptions = {}): Promise<ExecResult> {
    return this.exec(tenant, [...OPENCLAW_ENTRY, ...args], opts);
  }

  async writeFile(tenant: string, path: string, content: string) {
    const res = await this.exec(
      tenant,
      ["sh", "-c", 'mkdir -p "$(dirname "$1")" && cat > "$1"', "sh", path],
      { stdin: content },
    );
    if (res.exitCode !== 0) throw new Error(`falha ao escrever ${path}: ${res.output}`);
  }

  gatewayUrl(port: number) {
    // Fleet publica só em 127.0.0.1 — o portal roda no mesmo host.
    return `http://127.0.0.1:${port}`;
  }

  async exec(tenant: string, cmd: string[], { stdin, timeoutMs = 120_000 }: ExecOptions = {}): Promise<ExecResult> {
    const exec = await this.container(tenant).exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: stdin !== undefined,
      Tty: false,
      User: "node",
    });
    const stream = await exec.start({ hijack: true, stdin: stdin !== undefined });
    const chunks: Buffer[] = [];
    const sink = new PassThrough();
    sink.on("data", (c: Buffer) => chunks.push(c));
    this.docker.modem.demuxStream(stream, sink, sink);
    if (stdin !== undefined) {
      stream.write(stdin);
      // Fecha só o lado de escrita, para o processo ver EOF e seguir.
      (stream as unknown as { end(): void }).end();
    }
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => {
        stream.destroy();
        reject(new Error(`timeout executando ${cmd.slice(0, 4).join(" ")}`));
      }, timeoutMs);
      stream.on("end", () => { clearTimeout(t); resolve(); });
      stream.on("close", () => { clearTimeout(t); resolve(); });
      stream.on("error", (e) => { clearTimeout(t); reject(e); });
    });
    const exitCode = await waitExit(exec);
    return { exitCode, output: stripAnsi(Buffer.concat(chunks).toString("utf8")) };
  }

  async openclawInteractive(tenant: string, args: string[]): Promise<InteractiveExec> {
    const exec = await this.container(tenant).exec({
      Cmd: [...OPENCLAW_ENTRY, ...args],
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: true,
      Tty: true,
      User: "node",
      Env: ["COLUMNS=200", "LINES=50", "TERM=xterm-256color"],
    });
    const stream = await exec.start({ hijack: true, stdin: true, Tty: true });
    let buf = "";
    stream.on("data", (c: Buffer) => {
      buf += c.toString("utf8");
      if (buf.length > 200_000) buf = buf.slice(-100_000);
    });
    const done = new Promise<ExecResult>((resolve) => {
      const finish = async () => {
        resolve({ exitCode: await waitExit(exec).catch(() => -1), output: stripAnsi(buf) });
      };
      stream.on("end", finish);
      stream.on("close", finish);
      stream.on("error", finish);
    });
    return {
      output: () => stripAnsi(buf),
      write: (d) => stream.write(d),
      done,
      kill: () => stream.destroy(),
    };
  }
}
