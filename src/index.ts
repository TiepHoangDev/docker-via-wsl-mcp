import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { containerTools } from "./tools/containers.js";
import { imageTools } from "./tools/images.js";
import { networkTools } from "./tools/networks.js";
import { volumeTools } from "./tools/volumes.js";
import { composeTools } from "./tools/compose.js";
import { systemTools } from "./tools/system.js";
import type { ToolHandler } from "./tools/containers.js";

const allHandlers = new Map<string, ToolHandler["handle"]>();

const allToolGroups: ToolHandler[][] = [
  containerTools,
  imageTools,
  networkTools,
  volumeTools,
  composeTools,
  systemTools,
];

for (const group of allToolGroups) {
  for (const { tool, handle } of group) {
    allHandlers.set(tool.name, handle);
  }
}

const server = new Server(
  {
    name: "docker-via-wsl",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = allToolGroups.flatMap((group) => group.map((h) => h.tool));
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const handler = allHandlers.get(name);
  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const output = await handler((args as Record<string, unknown>) ?? {});
    return {
      content: [{ type: "text", text: output }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("docker-via-wsl MCP server running on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
