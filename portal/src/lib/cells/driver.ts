// Abstração do runtime das cells. MVP: FleetDriver (openclaw fleet + Docker local).
// Depois: K8sDriver (namespace + PVC por tenant) sem mudar o resto do portal.

export type CreatedCell = {
  tenant: string;
  port: number;
  token: string;
};

export type ExecResult = {
  exitCode: number;
  output: string;
};

export type ExecOptions = {
  /** Conteúdo enviado ao stdin (segredos vão por aqui, nunca por argv). */
  stdin?: string;
  timeoutMs?: number;
};

export type InteractiveExec = {
  /** Saída acumulada (sem códigos ANSI). */
  output(): string;
  write(data: string): void;
  done: Promise<ExecResult>;
  kill(): void;
};

export interface CellDriver {
  create(tenant: string): Promise<CreatedCell>;
  remove(tenant: string, opts: { purgeData: boolean }): Promise<void>;
  restart(tenant: string): Promise<void>;
  state(tenant: string): Promise<"running" | "stopped" | "missing">;
  /** Roda o CLI do OpenClaw dentro da cell (conexão loopback, já autorizada). */
  openclaw(tenant: string, args: string[], opts?: ExecOptions): Promise<ExecResult>;
  /** Igual ao anterior, mas com TTY — para fluxos que exigem terminal (ex.: device-code). */
  openclawInteractive(tenant: string, args: string[]): Promise<InteractiveExec>;
  /** Comando arbitrário dentro da cell (como usuário node). */
  exec(tenant: string, cmd: string[], opts?: ExecOptions): Promise<ExecResult>;
  /** Escreve um arquivo dentro da cell (como usuário node). */
  writeFile(tenant: string, path: string, content: string): Promise<void>;
  /** URL base do gateway, alcançável a partir do portal. */
  gatewayUrl(port: number): string;
}
