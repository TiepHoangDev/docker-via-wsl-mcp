/**
 * Full test suite for docker-via-wsl MCP server.
 * Runs all tools, writes results to test-results.txt
 */
import { spawn } from "child_process";
import { writeFileSync } from "fs";

const server = spawn("node", ["dist/index.js"], { stdio: ["pipe", "pipe", "pipe"] });

let buffer = "";
const pending = new Map();
let msgId = 0;

server.stderr.on("data", (d) => process.stderr.write("[server] " + d));
server.stdout.on("data", (chunk) => {
  buffer += chunk.toString("utf-8");
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id != null && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    } catch { }
  }
});

function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}
function notify(method, params = {}) {
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}
function call(name, args = {}) {
  return send("tools/call", { name, arguments: args });
}
function text(res) {
  return res?.result?.content?.[0]?.text?.trim() ?? "(empty)";
}
function isErr(res) {
  return !!res?.result?.isError;
}

const results = [];
function record(group, tool, status, output) {
  const icon = status === "PASS" ? "✓" : status === "SKIP" ? "~" : "✗";
  results.push({ group, tool, status, icon, output: output?.slice(0, 200) });
}

async function run() {
  // Handshake
  await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-full", version: "0.0.1" },
  });
  notify("notifications/initialized");

  // ── SYSTEM ──────────────────────────────────────────────
  let r;

  r = await call("docker_version");
  record("system", "docker_version", isErr(r) ? "FAIL" : "PASS", text(r));

  r = await call("docker_info", { format: "{{.ServerVersion}}" });
  record("system", "docker_info", isErr(r) ? "FAIL" : "PASS", text(r));

  r = await call("docker_system_df");
  record("system", "docker_system_df", isErr(r) ? "FAIL" : "PASS", text(r));

  // ── CONTAINERS ──────────────────────────────────────────
  r = await call("docker_ps", { all: true });
  record("containers", "docker_ps (all)", isErr(r) ? "FAIL" : "PASS", text(r));

  // run
  r = await call("docker_run", { image: "ubuntu:latest", name: "mcp-test", detach: true, command: "sleep 60" });
  record("containers", "docker_run", isErr(r) ? "FAIL" : "PASS", text(r));

  // exec
  r = await call("docker_exec", { container: "mcp-test", command: "echo hello-from-exec" });
  record("containers", "docker_exec", text(r).includes("hello-from-exec") ? "PASS" : "FAIL", text(r));

  // ps with filter
  r = await call("docker_ps", { filter: "name=mcp-test", format: "{{.Names}}" });
  record("containers", "docker_ps (filter)", text(r).includes("mcp-test") ? "PASS" : "FAIL", text(r));

  // logs
  r = await call("docker_logs", { container: "mcp-test", tail: "5" });
  record("containers", "docker_logs", isErr(r) ? "FAIL" : "PASS", text(r));

  // inspect
  r = await call("docker_inspect", { targets: ["mcp-test"], format: "{{.Name}}" });
  record("containers", "docker_inspect", text(r).includes("mcp-test") ? "PASS" : "FAIL", text(r));

  // stop
  r = await call("docker_stop", { containers: ["mcp-test"] });
  record("containers", "docker_stop", isErr(r) ? "FAIL" : "PASS", text(r));

  // start
  r = await call("docker_start", { containers: ["mcp-test"] });
  record("containers", "docker_start", isErr(r) ? "FAIL" : "PASS", text(r));

  // restart
  r = await call("docker_restart", { containers: ["mcp-test"] });
  record("containers", "docker_restart", isErr(r) ? "FAIL" : "PASS", text(r));

  // stop + rm
  await call("docker_stop", { containers: ["mcp-test"] });
  r = await call("docker_rm", { containers: ["mcp-test"] });
  record("containers", "docker_rm", isErr(r) ? "FAIL" : "PASS", text(r));

  // ── IMAGES ──────────────────────────────────────────────
  r = await call("docker_images");
  record("images", "docker_images", isErr(r) ? "FAIL" : "PASS", text(r).split("\n")[0]);

  r = await call("docker_image_inspect", { images: ["ubuntu:latest"], format: "{{.Os}}/{{.Architecture}}" });
  record("images", "docker_image_inspect", isErr(r) ? "FAIL" : "PASS", text(r));

  r = await call("docker_tag", { source: "ubuntu:latest", target: "ubuntu:mcp-test-tag" });
  record("images", "docker_tag", isErr(r) ? "FAIL" : "PASS", text(r));

  r = await call("docker_rmi", { images: ["ubuntu:mcp-test-tag"] });
  record("images", "docker_rmi", isErr(r) ? "FAIL" : "PASS", text(r));

  // pull (small image)
  r = await call("docker_pull", { image: "hello-world:latest" });
  record("images", "docker_pull", isErr(r) ? "FAIL" : "PASS", text(r).split("\n")[0]);

  // cleanup hello-world
  await call("docker_rmi", { images: ["hello-world:latest"], force: true });

  // docker_push — skip (needs auth), just record
  record("images", "docker_push", "SKIP", "requires registry auth");

  // docker_build — skip (needs Dockerfile path), just record
  record("images", "docker_build", "SKIP", "requires WSL Dockerfile path");

  // ── NETWORKS ────────────────────────────────────────────
  r = await call("docker_network_ls");
  record("networks", "docker_network_ls", isErr(r) ? "FAIL" : "PASS", text(r).split("\n")[0]);

  r = await call("docker_network_create", { name: "mcp-test-net2", driver: "bridge" });
  record("networks", "docker_network_create", isErr(r) ? "FAIL" : "PASS", text(r).slice(0, 20));

  r = await call("docker_network_inspect", { networks: ["mcp-test-net2"], format: "{{.Name}}" });
  record("networks", "docker_network_inspect", text(r).includes("mcp-test-net2") ? "PASS" : "FAIL", text(r));

  // connect/disconnect (use a temp container)
  await call("docker_run", { image: "ubuntu:latest", name: "mcp-net-ctr", detach: true, command: "sleep 30" });

  r = await call("docker_network_connect", { network: "mcp-test-net2", container: "mcp-net-ctr" });
  record("networks", "docker_network_connect", isErr(r) ? "FAIL" : "PASS", text(r));

  r = await call("docker_network_disconnect", { network: "mcp-test-net2", container: "mcp-net-ctr" });
  record("networks", "docker_network_disconnect", isErr(r) ? "FAIL" : "PASS", text(r));

  await call("docker_stop", { containers: ["mcp-net-ctr"] });
  await call("docker_rm", { containers: ["mcp-net-ctr"] });

  r = await call("docker_network_rm", { networks: ["mcp-test-net2"] });
  record("networks", "docker_network_rm", isErr(r) ? "FAIL" : "PASS", text(r));

  // cleanup leftover from previous test session if exists
  await call("docker_network_rm", { networks: ["mcp-test-net"] }).catch(() => {});

  // ── VOLUMES ─────────────────────────────────────────────
  r = await call("docker_volume_ls");
  record("volumes", "docker_volume_ls", isErr(r) ? "FAIL" : "PASS", text(r).split("\n")[0]);

  r = await call("docker_volume_create", { name: "mcp-test-vol2", driver: "local" });
  record("volumes", "docker_volume_create", isErr(r) ? "FAIL" : "PASS", text(r));

  r = await call("docker_volume_inspect", { volumes: ["mcp-test-vol2"], format: "{{.Name}}" });
  record("volumes", "docker_volume_inspect", text(r).includes("mcp-test-vol2") ? "PASS" : "FAIL", text(r));

  r = await call("docker_volume_rm", { volumes: ["mcp-test-vol2"] });
  record("volumes", "docker_volume_rm", isErr(r) ? "FAIL" : "PASS", text(r));

  // cleanup leftover from previous session
  await call("docker_volume_rm", { volumes: ["mcp-test-vol"] }).catch(() => {});

  // ── COMPOSE ─────────────────────────────────────────────
  // Create a minimal compose file in WSL for testing
  await call("docker_exec", { container: "dummy", command: "true" }).catch(() => {});

  // Write a test compose file via WSL
  const composeYaml = `services:\n  test:\n    image: ubuntu:latest\n    command: sleep 10\n`;
  const writeR = await send("tools/call", {
    name: "docker_exec",
    arguments: { container: "nonexistent", command: "true" },
  }).catch(() => null);

  // Use docker run to create the compose file in WSL
  const mkdirR = await call("docker_run", {
    image: "ubuntu:latest",
    rm: true,
    command: `bash -c "mkdir -p /tmp/mcp-compose-test && echo 'services:\\n  svc:\\n    image: ubuntu:latest\\n    command: sleep 5' > /tmp/mcp-compose-test/docker-compose.yml"`,
  });

  // Actually write compose file directly via wsl
  record("compose", "docker_compose_*", "SKIP", "compose tests require writing a file to WSL — see README");

  // ── SYSTEM PRUNE (dry check only — don't actually prune) ─
  record("system", "docker_system_prune", "SKIP", "skipped to avoid removing real data");

  // ── SUMMARY ─────────────────────────────────────────────
  const pass = results.filter(r => r.status === "PASS").length;
  const fail = results.filter(r => r.status === "FAIL").length;
  const skip = results.filter(r => r.status === "SKIP").length;

  let out = `docker-via-wsl MCP — Full Test Results\n`;
  out += `${"=".repeat(60)}\n`;
  out += `PASS: ${pass}  FAIL: ${fail}  SKIP: ${skip}  TOTAL: ${results.length}\n`;
  out += `${"=".repeat(60)}\n\n`;

  let lastGroup = "";
  for (const r of results) {
    if (r.group !== lastGroup) {
      out += `\n[${r.group.toUpperCase()}]\n`;
      lastGroup = r.group;
    }
    out += `  ${r.icon} ${r.tool.padEnd(35)} ${r.status}  ${r.output ?? ""}\n`;
  }

  writeFileSync("test-results.txt", out, "utf-8");
  console.log(out);

  server.stdin.end();
  server.kill();
}

run().catch((err) => {
  console.error("Fatal:", err);
  server.kill();
  process.exit(1);
});
