/**
 * Quick smoke test for docker-via-wsl MCP server.
 * Tests tool listing + several docker commands via WSL.
 */
import { spawn } from "child_process";

const server = spawn("node", ["dist/index.js"], {
  stdio: ["pipe", "pipe", "pipe"],
  cwd: process.cwd(),
});

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
    } catch {
      // ignore non-JSON lines
    }
  }
});

function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
    server.stdin.write(msg);
  });
}

function notify(method, params = {}) {
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}

function pass(label) { console.log(`  ✓  ${label}`); }
function fail(label, detail) { console.error(`  ✗  ${label}: ${detail}`); }

async function run() {
  // 1. Initialize handshake
  const initRes = await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-client", version: "0.0.1" },
  });
  notify("notifications/initialized");

  if (initRes.result?.serverInfo?.name === "docker-via-wsl") {
    pass("initialize handshake");
  } else {
    fail("initialize handshake", JSON.stringify(initRes));
  }

  // 2. List tools
  const listRes = await send("tools/list");
  const tools = listRes.result?.tools ?? [];
  const toolNames = tools.map((t) => t.name);
  const expectedCount = 37;
  if (tools.length >= expectedCount) {
    pass(`tools/list — ${tools.length} tools registered`);
  } else {
    fail("tools/list", `expected ≥${expectedCount}, got ${tools.length}: ${toolNames.join(", ")}`);
  }

  // 3. docker_version
  const verRes = await send("tools/call", { name: "docker_version", arguments: {} });
  const verText = verRes.result?.content?.[0]?.text ?? "";
  if (verText.toLowerCase().includes("version")) {
    pass(`docker_version — ${verText.split("\n")[0].trim()}`);
  } else if (verRes.result?.isError) {
    fail("docker_version", verText);
  } else {
    fail("docker_version", "unexpected response: " + JSON.stringify(verRes));
  }

  // 4. docker_info (short format)
  const infoRes = await send("tools/call", {
    name: "docker_info",
    arguments: { format: "{{.ServerVersion}}" },
  });
  const infoText = infoRes.result?.content?.[0]?.text ?? "";
  if (infoText.trim()) {
    pass(`docker_info (ServerVersion) — ${infoText.trim()}`);
  } else {
    fail("docker_info", JSON.stringify(infoRes));
  }

  // 5. docker_ps
  const psRes = await send("tools/call", { name: "docker_ps", arguments: { all: true } });
  const psText = psRes.result?.content?.[0]?.text ?? "";
  if (psText.toLowerCase().includes("container") || psText.includes("CONTAINER")) {
    pass("docker_ps --all");
  } else if (psRes.result?.isError) {
    fail("docker_ps", psText);
  } else {
    pass("docker_ps --all (no containers running)");
  }

  // 6. docker_images
  const imgRes = await send("tools/call", { name: "docker_images", arguments: {} });
  const imgText = imgRes.result?.content?.[0]?.text ?? "";
  if (imgText.includes("REPOSITORY") || imgText.includes("repository")) {
    pass("docker_images");
  } else if (imgRes.result?.isError) {
    fail("docker_images", imgText);
  } else {
    pass("docker_images (no images)");
  }

  // 7. docker_network_ls
  const netRes = await send("tools/call", { name: "docker_network_ls", arguments: {} });
  const netText = netRes.result?.content?.[0]?.text ?? "";
  if (netText.includes("bridge") || netText.includes("NETWORK")) {
    pass("docker_network_ls");
  } else {
    fail("docker_network_ls", netText);
  }

  // 8. docker_volume_ls
  const volRes = await send("tools/call", { name: "docker_volume_ls", arguments: {} });
  const volText = volRes.result?.content?.[0]?.text ?? "";
  if (volText.includes("DRIVER") || !volRes.result?.isError) {
    pass("docker_volume_ls");
  } else {
    fail("docker_volume_ls", volText);
  }

  // 9. docker_system_df
  const dfRes = await send("tools/call", { name: "docker_system_df", arguments: {} });
  const dfText = dfRes.result?.content?.[0]?.text ?? "";
  if (dfText.includes("TYPE") || dfText.includes("Images")) {
    pass("docker_system_df");
  } else {
    fail("docker_system_df", dfText);
  }

  server.stdin.end();
  server.kill();
  console.log("\nDone.");
}

run().catch((err) => {
  console.error("Test error:", err);
  server.kill();
  process.exit(1);
});
