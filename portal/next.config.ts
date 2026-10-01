import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Módulos nativos/Node usados só no servidor (driver das cells).
  serverExternalPackages: ["dockerode", "docker-modem", "ssh2", "cpu-features"],
};

export default nextConfig;
