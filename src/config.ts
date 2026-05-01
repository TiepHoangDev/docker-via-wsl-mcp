import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Config {
  wslDistro: string;
  dockerPath: string;
  cmdTimeoutMs: number;
}

function loadConfig(): Config {
  let fileConfig: Partial<Config> = {};
  const configPath = join(__dirname, "..", "config.json");

  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, "utf-8");
      fileConfig = JSON.parse(raw);
    } catch {
      // silently ignore malformed config.json
    }
  }

  return {
    wslDistro: process.env["WSL_DISTRO"] ?? fileConfig.wslDistro ?? "Ubuntu",
    dockerPath: process.env["DOCKER_PATH"] ?? fileConfig.dockerPath ?? "docker",
    cmdTimeoutMs: process.env["CMD_TIMEOUT_MS"]
      ? parseInt(process.env["CMD_TIMEOUT_MS"], 10)
      : fileConfig.cmdTimeoutMs ?? 30000,
  };
}

export const config = loadConfig();
