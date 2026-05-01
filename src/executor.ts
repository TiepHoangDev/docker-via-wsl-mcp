import { spawn } from "child_process";
import { config } from "./config.js";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runDocker(args: string[]): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const wslArgs = ["-d", config.wslDistro, config.dockerPath, ...args];

    const proc = spawn("wsl", wslArgs, { windowsHide: true });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Docker command timed out after ${config.cmdTimeoutMs}ms`));
    }, config.cmdTimeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export function formatResult(result: ExecResult): string {
  const parts: string[] = [];

  if (result.stdout.trim()) {
    parts.push(result.stdout.trim());
  }

  if (result.stderr.trim()) {
    parts.push(`[stderr]\n${result.stderr.trim()}`);
  }

  if (parts.length === 0) {
    parts.push("(no output)");
  }

  if (result.exitCode !== 0) {
    parts.push(`[exit code: ${result.exitCode}]`);
  }

  return parts.join("\n\n");
}

export async function execDocker(args: string[]): Promise<string> {
  const result = await runDocker(args);
  return formatResult(result);
}
