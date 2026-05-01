import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { execDocker } from "../executor.js";

export interface ToolHandler {
  tool: Tool;
  handle: (args: Record<string, unknown>) => Promise<string>;
}

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

export const containerTools: ToolHandler[] = [
  {
    tool: {
      name: "docker_ps",
      description:
        "List Docker containers. Use 'all' to include stopped containers.",
      inputSchema: {
        type: "object",
        properties: {
          all: {
            type: "boolean",
            description: "Show all containers (default shows just running)",
          },
          filter: {
            type: "string",
            description:
              "Filter output based on conditions (e.g. 'status=exited')",
          },
          format: {
            type: "string",
            description: "Pretty-print using a Go template",
          },
          last: {
            type: "number",
            description: "Show n last created containers",
          },
          size: { type: "boolean", description: "Display total file sizes" },
        },
      },
    },
    handle: async (args) => {
      const cmd = ["ps"];
      if (bool(args["all"])) cmd.push("--all");
      if (args["filter"]) cmd.push("--filter", str(args["filter"]));
      if (args["format"]) cmd.push("--format", str(args["format"]));
      if (args["last"]) cmd.push("--last", str(args["last"]));
      if (bool(args["size"])) cmd.push("--size");
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_run",
      description: "Run a command in a new Docker container.",
      inputSchema: {
        type: "object",
        properties: {
          image: { type: "string", description: "Image to run (required)" },
          name: {
            type: "string",
            description: "Assign a name to the container",
          },
          detach: {
            type: "boolean",
            description: "Run container in background",
          },
          rm: {
            type: "boolean",
            description: "Automatically remove the container when it exits",
          },
          ports: {
            type: "array",
            items: { type: "string" },
            description: "Port mappings e.g. ['8080:80', '443:443']",
          },
          env: {
            type: "array",
            items: { type: "string" },
            description: "Environment variables e.g. ['KEY=VALUE']",
          },
          volumes: {
            type: "array",
            items: { type: "string" },
            description: "Volume mounts e.g. ['/host/path:/container/path']",
          },
          network: {
            type: "string",
            description: "Connect a container to a network",
          },
          user: { type: "string", description: "Username or UID" },
          workdir: {
            type: "string",
            description: "Working directory inside the container",
          },
          entrypoint: {
            type: "string",
            description: "Overwrite the default ENTRYPOINT",
          },
          command: {
            type: "string",
            description: "Command to run inside the container",
          },
          extra_args: {
            type: "array",
            items: { type: "string" },
            description: "Extra raw arguments passed directly to docker run",
          },
        },
        required: ["image"],
      },
    },
    handle: async (args) => {
      const cmd = ["run"];
      if (bool(args["detach"])) cmd.push("--detach");
      if (bool(args["rm"])) cmd.push("--rm");
      if (args["name"]) cmd.push("--name", str(args["name"]));
      for (const p of strArr(args["ports"])) cmd.push("--publish", p);
      for (const e of strArr(args["env"])) cmd.push("--env", e);
      for (const v of strArr(args["volumes"])) cmd.push("--volume", v);
      if (args["network"]) cmd.push("--network", str(args["network"]));
      if (args["user"]) cmd.push("--user", str(args["user"]));
      if (args["workdir"]) cmd.push("--workdir", str(args["workdir"]));
      if (args["entrypoint"]) cmd.push("--entrypoint", str(args["entrypoint"]));
      for (const a of strArr(args["extra_args"])) cmd.push(a);
      cmd.push(str(args["image"]));
      if (args["command"]) cmd.push(...str(args["command"]).split(" "));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_start",
      description: "Start one or more stopped containers.",
      inputSchema: {
        type: "object",
        properties: {
          containers: {
            type: "array",
            items: { type: "string" },
            description: "Container names or IDs to start",
          },
          attach: {
            type: "boolean",
            description: "Attach STDOUT/STDERR and forward signals",
          },
        },
        required: ["containers"],
      },
    },
    handle: async (args) => {
      const cmd = ["start"];
      if (bool(args["attach"])) cmd.push("--attach");
      cmd.push(...strArr(args["containers"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_stop",
      description: "Stop one or more running containers.",
      inputSchema: {
        type: "object",
        properties: {
          containers: {
            type: "array",
            items: { type: "string" },
            description: "Container names or IDs to stop",
          },
          timeout: {
            type: "number",
            description: "Seconds to wait before killing (default 10)",
          },
        },
        required: ["containers"],
      },
    },
    handle: async (args) => {
      const cmd = ["stop"];
      if (args["timeout"] !== undefined)
        cmd.push("--time", str(args["timeout"]));
      cmd.push(...strArr(args["containers"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_restart",
      description: "Restart one or more containers.",
      inputSchema: {
        type: "object",
        properties: {
          containers: {
            type: "array",
            items: { type: "string" },
            description: "Container names or IDs to restart",
          },
          timeout: {
            type: "number",
            description: "Seconds to wait before killing (default 10)",
          },
        },
        required: ["containers"],
      },
    },
    handle: async (args) => {
      const cmd = ["restart"];
      if (args["timeout"] !== undefined)
        cmd.push("--time", str(args["timeout"]));
      cmd.push(...strArr(args["containers"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_rm",
      description: "Remove one or more containers.",
      inputSchema: {
        type: "object",
        properties: {
          containers: {
            type: "array",
            items: { type: "string" },
            description: "Container names or IDs to remove",
          },
          force: {
            type: "boolean",
            description: "Force the removal of a running container",
          },
          volumes: {
            type: "boolean",
            description:
              "Remove anonymous volumes associated with the container",
          },
        },
        required: ["containers"],
      },
    },
    handle: async (args) => {
      const cmd = ["rm"];
      if (bool(args["force"])) cmd.push("--force");
      if (bool(args["volumes"])) cmd.push("--volumes");
      cmd.push(...strArr(args["containers"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_exec",
      description: "Run a command in a running container.",
      inputSchema: {
        type: "object",
        properties: {
          container: {
            type: "string",
            description: "Container name or ID (required)",
          },
          command: {
            type: "string",
            description: "Command to execute (required)",
          },
          detach: { type: "boolean", description: "Run command in background" },
          user: { type: "string", description: "Username or UID" },
          workdir: {
            type: "string",
            description: "Working directory inside the container",
          },
          env: {
            type: "array",
            items: { type: "string" },
            description: "Environment variables e.g. ['KEY=VALUE']",
          },
        },
        required: ["container", "command"],
      },
    },
    handle: async (args) => {
      const cmd = ["exec"];
      if (bool(args["detach"])) cmd.push("--detach");
      if (args["user"]) cmd.push("--user", str(args["user"]));
      if (args["workdir"]) cmd.push("--workdir", str(args["workdir"]));
      for (const e of strArr(args["env"])) cmd.push("--env", e);
      cmd.push(str(args["container"]));
      cmd.push(...str(args["command"]).split(" "));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_logs",
      description: "Fetch the logs of a container.",
      inputSchema: {
        type: "object",
        properties: {
          container: {
            type: "string",
            description: "Container name or ID (required)",
          },
          tail: {
            type: "string",
            description: "Number of lines from the end (e.g. '50' or 'all')",
          },
          since: {
            type: "string",
            description:
              "Show logs since timestamp (e.g. '2024-01-01' or '10m')",
          },
          until: {
            type: "string",
            description: "Show logs before a timestamp",
          },
          timestamps: { type: "boolean", description: "Show timestamps" },
        },
        required: ["container"],
      },
    },
    handle: async (args) => {
      const cmd = ["logs"];
      if (args["tail"]) cmd.push("--tail", str(args["tail"]));
      if (args["since"]) cmd.push("--since", str(args["since"]));
      if (args["until"]) cmd.push("--until", str(args["until"]));
      if (bool(args["timestamps"])) cmd.push("--timestamps");
      cmd.push(str(args["container"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_inspect",
      description:
        "Return low-level information on Docker objects (containers, images, networks, volumes).",
      inputSchema: {
        type: "object",
        properties: {
          targets: {
            type: "array",
            items: { type: "string" },
            description: "Names or IDs to inspect (required)",
          },
          format: { type: "string", description: "Go template format string" },
          type: {
            type: "string",
            enum: [
              "container",
              "image",
              "network",
              "volume",
              "node",
              "service",
              "task",
            ],
            description: "Return JSON for specified type",
          },
        },
        required: ["targets"],
      },
    },
    handle: async (args) => {
      const cmd = ["inspect"];
      if (args["format"]) cmd.push("--format", str(args["format"]));
      if (args["type"]) cmd.push("--type", str(args["type"]));
      cmd.push(...strArr(args["targets"]));
      return execDocker(cmd);
    },
  },
];
