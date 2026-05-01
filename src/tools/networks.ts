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

export const networkTools: ToolHandler[] = [
  {
    tool: {
      name: "docker_network_ls",
      description: "List all Docker networks.",
      inputSchema: {
        type: "object",
        properties: {
          filter: { type: "string", description: "Filter output based on conditions (e.g. 'driver=bridge')" },
          format: { type: "string", description: "Pretty-print using a Go template" },
        },
      },
    },
    handle: async (args) => {
      const cmd = ["network", "ls"];
      if (args["filter"]) cmd.push("--filter", str(args["filter"]));
      if (args["format"]) cmd.push("--format", str(args["format"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_network_create",
      description: "Create a Docker network.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Network name (required)" },
          driver: { type: "string", description: "Driver to manage the network (default: bridge)" },
          subnet: { type: "string", description: "Subnet in CIDR format (e.g. '172.20.0.0/16')" },
          gateway: { type: "string", description: "IPv4 or IPv6 gateway for the master subnet" },
          internal: { type: "boolean", description: "Restrict external access to the network" },
          attachable: { type: "boolean", description: "Enable manual container attachment" },
          labels: {
            type: "array",
            items: { type: "string" },
            description: "Set metadata on a network (e.g. ['key=value'])",
          },
        },
        required: ["name"],
      },
    },
    handle: async (args) => {
      const cmd = ["network", "create"];
      if (args["driver"]) cmd.push("--driver", str(args["driver"]));
      if (args["subnet"]) cmd.push("--subnet", str(args["subnet"]));
      if (args["gateway"]) cmd.push("--gateway", str(args["gateway"]));
      if (bool(args["internal"])) cmd.push("--internal");
      if (bool(args["attachable"])) cmd.push("--attachable");
      for (const l of strArr(args["labels"])) cmd.push("--label", l);
      cmd.push(str(args["name"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_network_rm",
      description: "Remove one or more Docker networks.",
      inputSchema: {
        type: "object",
        properties: {
          networks: {
            type: "array",
            items: { type: "string" },
            description: "Network names or IDs to remove (required)",
          },
        },
        required: ["networks"],
      },
    },
    handle: async (args) => {
      return execDocker(["network", "rm", ...strArr(args["networks"])]);
    },
  },

  {
    tool: {
      name: "docker_network_inspect",
      description: "Display detailed information on one or more Docker networks.",
      inputSchema: {
        type: "object",
        properties: {
          networks: {
            type: "array",
            items: { type: "string" },
            description: "Network names or IDs to inspect (required)",
          },
          format: { type: "string", description: "Go template format string" },
        },
        required: ["networks"],
      },
    },
    handle: async (args) => {
      const cmd = ["network", "inspect"];
      if (args["format"]) cmd.push("--format", str(args["format"]));
      cmd.push(...strArr(args["networks"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_network_connect",
      description: "Connect a container to a Docker network.",
      inputSchema: {
        type: "object",
        properties: {
          network: { type: "string", description: "Network name or ID (required)" },
          container: { type: "string", description: "Container name or ID (required)" },
          alias: { type: "string", description: "Add network-scoped alias for the container" },
          ip: { type: "string", description: "IPv4 address" },
          ip6: { type: "string", description: "IPv6 address" },
        },
        required: ["network", "container"],
      },
    },
    handle: async (args) => {
      const cmd = ["network", "connect"];
      if (args["alias"]) cmd.push("--alias", str(args["alias"]));
      if (args["ip"]) cmd.push("--ip", str(args["ip"]));
      if (args["ip6"]) cmd.push("--ip6", str(args["ip6"]));
      cmd.push(str(args["network"]), str(args["container"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_network_disconnect",
      description: "Disconnect a container from a Docker network.",
      inputSchema: {
        type: "object",
        properties: {
          network: { type: "string", description: "Network name or ID (required)" },
          container: { type: "string", description: "Container name or ID (required)" },
          force: { type: "boolean", description: "Force the container to disconnect" },
        },
        required: ["network", "container"],
      },
    },
    handle: async (args) => {
      const cmd = ["network", "disconnect"];
      if (bool(args["force"])) cmd.push("--force");
      cmd.push(str(args["network"]), str(args["container"]));
      return execDocker(cmd);
    },
  },
];
