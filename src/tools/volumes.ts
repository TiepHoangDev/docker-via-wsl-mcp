import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { execDocker } from "../executor.js";
import type { ToolHandler } from "./containers.js";

function str(v: unknown): string {
  return String(v ?? "");
}

function bool(v: unknown): boolean {
  return v === true || v === "true";
}

function strArr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}

export const volumeTools: ToolHandler[] = [
  {
    tool: {
      name: "docker_volume_ls",
      description: "List Docker volumes.",
      inputSchema: {
        type: "object",
        properties: {
          filter: { type: "string", description: "Filter output based on conditions (e.g. 'dangling=true')" },
          format: { type: "string", description: "Pretty-print using a Go template" },
        },
      },
    },
    handle: async (args) => {
      const cmd = ["volume", "ls"];
      if (args["filter"]) cmd.push("--filter", str(args["filter"]));
      if (args["format"]) cmd.push("--format", str(args["format"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_volume_create",
      description: "Create a Docker volume.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Volume name" },
          driver: { type: "string", description: "Volume driver name (default: local)" },
          labels: {
            type: "array",
            items: { type: "string" },
            description: "Set metadata (e.g. ['key=value'])",
          },
          options: {
            type: "array",
            items: { type: "string" },
            description: "Driver-specific options (e.g. ['type=nfs'])",
          },
        },
      },
    },
    handle: async (args) => {
      const cmd = ["volume", "create"];
      if (args["driver"]) cmd.push("--driver", str(args["driver"]));
      for (const l of strArr(args["labels"])) cmd.push("--label", l);
      for (const o of strArr(args["options"])) cmd.push("--opt", o);
      if (args["name"]) cmd.push(str(args["name"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_volume_rm",
      description: "Remove one or more Docker volumes.",
      inputSchema: {
        type: "object",
        properties: {
          volumes: {
            type: "array",
            items: { type: "string" },
            description: "Volume names to remove (required)",
          },
          force: { type: "boolean", description: "Force the removal of one or more volumes" },
        },
        required: ["volumes"],
      },
    },
    handle: async (args) => {
      const cmd = ["volume", "rm"];
      if (bool(args["force"])) cmd.push("--force");
      cmd.push(...strArr(args["volumes"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_volume_inspect",
      description: "Display detailed information on one or more Docker volumes.",
      inputSchema: {
        type: "object",
        properties: {
          volumes: {
            type: "array",
            items: { type: "string" },
            description: "Volume names to inspect (required)",
          },
          format: { type: "string", description: "Go template format string" },
        },
        required: ["volumes"],
      },
    },
    handle: async (args) => {
      const cmd = ["volume", "inspect"];
      if (args["format"]) cmd.push("--format", str(args["format"]));
      cmd.push(...strArr(args["volumes"]));
      return execDocker(cmd);
    },
  },
];
