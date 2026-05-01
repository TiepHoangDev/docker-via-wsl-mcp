import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { execDocker } from "../executor.js";
import type { ToolHandler } from "./containers.js";

function str(v: unknown): string {
  return String(v ?? "");
}

function bool(v: unknown): boolean {
  return v === true || v === "true";
}

export const systemTools: ToolHandler[] = [
  {
    tool: {
      name: "docker_info",
      description: "Display system-wide Docker information.",
      inputSchema: {
        type: "object",
        properties: {
          format: { type: "string", description: "Go template format string" },
        },
      },
    },
    handle: async (args) => {
      const cmd = ["info"];
      if (args["format"]) cmd.push("--format", str(args["format"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_version",
      description: "Show the Docker version information.",
      inputSchema: {
        type: "object",
        properties: {
          format: { type: "string", description: "Go template format string" },
        },
      },
    },
    handle: async (args) => {
      const cmd = ["version"];
      if (args["format"]) cmd.push("--format", str(args["format"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_system_df",
      description: "Show Docker disk usage (images, containers, volumes, build cache).",
      inputSchema: {
        type: "object",
        properties: {
          verbose: { type: "boolean", description: "Show detailed information on space usage" },
          format: { type: "string", description: "Go template format string" },
        },
      },
    },
    handle: async (args) => {
      const cmd = ["system", "df"];
      if (bool(args["verbose"])) cmd.push("--verbose");
      if (args["format"]) cmd.push("--format", str(args["format"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_system_prune",
      description: "Remove unused Docker data (stopped containers, dangling images, unused networks).",
      inputSchema: {
        type: "object",
        properties: {
          all: { type: "boolean", description: "Remove all unused images, not just dangling ones" },
          volumes: { type: "boolean", description: "Prune anonymous volumes" },
          force: { type: "boolean", description: "Do not prompt for confirmation" },
          filter: { type: "string", description: "Provide filter values (e.g. 'until=24h')" },
        },
      },
    },
    handle: async (args) => {
      const cmd = ["system", "prune"];
      if (bool(args["all"])) cmd.push("--all");
      if (bool(args["volumes"])) cmd.push("--volumes");
      if (bool(args["force"])) cmd.push("--force");
      if (args["filter"]) cmd.push("--filter", str(args["filter"]));
      return execDocker(cmd);
    },
  },
];
