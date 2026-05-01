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

function composeBaseArgs(args: Record<string, unknown>): string[] {
  const cmd = ["compose"];
  if (args["file"]) cmd.push("--file", str(args["file"]));
  if (args["project_name"]) cmd.push("--project-name", str(args["project_name"]));
  return cmd;
}

export const composeTools: ToolHandler[] = [
  {
    tool: {
      name: "docker_compose_up",
      description: "Build, (re)create, start, and attach to containers for a service. File paths must be WSL-style.",
      inputSchema: {
        type: "object",
        properties: {
          file: { type: "string", description: "Path to docker-compose file in WSL (default: docker-compose.yml)" },
          project_name: { type: "string", description: "Project name" },
          detach: { type: "boolean", description: "Run containers in background" },
          build: { type: "boolean", description: "Build images before starting containers" },
          no_build: { type: "boolean", description: "Do not build an image even if it is missing" },
          force_recreate: { type: "boolean", description: "Recreate containers even if config has not changed" },
          remove_orphans: { type: "boolean", description: "Remove containers for services not defined in Compose file" },
          services: {
            type: "array",
            items: { type: "string" },
            description: "Services to start (default: all)",
          },
        },
      },
    },
    handle: async (args) => {
      const cmd = composeBaseArgs(args);
      cmd.push("up");
      if (bool(args["detach"])) cmd.push("--detach");
      if (bool(args["build"])) cmd.push("--build");
      if (bool(args["no_build"])) cmd.push("--no-build");
      if (bool(args["force_recreate"])) cmd.push("--force-recreate");
      if (bool(args["remove_orphans"])) cmd.push("--remove-orphans");
      cmd.push(...strArr(args["services"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_compose_down",
      description: "Stop and remove containers, networks, images, and volumes created by 'up'.",
      inputSchema: {
        type: "object",
        properties: {
          file: { type: "string", description: "Path to docker-compose file in WSL" },
          project_name: { type: "string", description: "Project name" },
          volumes: { type: "boolean", description: "Remove named volumes declared in the volumes section" },
          remove_orphans: { type: "boolean", description: "Remove containers for services not defined in Compose file" },
          rmi: {
            type: "string",
            enum: ["all", "local"],
            description: "Remove images: 'all' or 'local'",
          },
        },
      },
    },
    handle: async (args) => {
      const cmd = composeBaseArgs(args);
      cmd.push("down");
      if (bool(args["volumes"])) cmd.push("--volumes");
      if (bool(args["remove_orphans"])) cmd.push("--remove-orphans");
      if (args["rmi"]) cmd.push("--rmi", str(args["rmi"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_compose_ps",
      description: "List containers for a Compose project.",
      inputSchema: {
        type: "object",
        properties: {
          file: { type: "string", description: "Path to docker-compose file in WSL" },
          project_name: { type: "string", description: "Project name" },
          services: {
            type: "array",
            items: { type: "string" },
            description: "Filter to specific services",
          },
          format: { type: "string", description: "Format output (e.g. 'json')" },
        },
      },
    },
    handle: async (args) => {
      const cmd = composeBaseArgs(args);
      cmd.push("ps");
      if (args["format"]) cmd.push("--format", str(args["format"]));
      cmd.push(...strArr(args["services"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_compose_logs",
      description: "View output from containers in a Compose project.",
      inputSchema: {
        type: "object",
        properties: {
          file: { type: "string", description: "Path to docker-compose file in WSL" },
          project_name: { type: "string", description: "Project name" },
          services: {
            type: "array",
            items: { type: "string" },
            description: "Services to show logs for",
          },
          tail: { type: "string", description: "Number of lines from the end (e.g. '50' or 'all')" },
          timestamps: { type: "boolean", description: "Show timestamps" },
          no_color: { type: "boolean", description: "Produce monochrome output" },
        },
      },
    },
    handle: async (args) => {
      const cmd = composeBaseArgs(args);
      cmd.push("logs");
      if (args["tail"]) cmd.push("--tail", str(args["tail"]));
      if (bool(args["timestamps"])) cmd.push("--timestamps");
      if (bool(args["no_color"])) cmd.push("--no-color");
      cmd.push(...strArr(args["services"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_compose_build",
      description: "Build or rebuild services in a Compose project.",
      inputSchema: {
        type: "object",
        properties: {
          file: { type: "string", description: "Path to docker-compose file in WSL" },
          project_name: { type: "string", description: "Project name" },
          services: {
            type: "array",
            items: { type: "string" },
            description: "Services to build (default: all)",
          },
          no_cache: { type: "boolean", description: "Do not use cache when building" },
          pull: { type: "boolean", description: "Always attempt to pull a newer version of the image" },
        },
      },
    },
    handle: async (args) => {
      const cmd = composeBaseArgs(args);
      cmd.push("build");
      if (bool(args["no_cache"])) cmd.push("--no-cache");
      if (bool(args["pull"])) cmd.push("--pull");
      cmd.push(...strArr(args["services"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_compose_pull",
      description: "Pull service images for a Compose project.",
      inputSchema: {
        type: "object",
        properties: {
          file: { type: "string", description: "Path to docker-compose file in WSL" },
          project_name: { type: "string", description: "Project name" },
          services: {
            type: "array",
            items: { type: "string" },
            description: "Services to pull (default: all)",
          },
          include_deps: { type: "boolean", description: "Also pull services declared as dependencies" },
        },
      },
    },
    handle: async (args) => {
      const cmd = composeBaseArgs(args);
      cmd.push("pull");
      if (bool(args["include_deps"])) cmd.push("--include-deps");
      cmd.push(...strArr(args["services"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_compose_restart",
      description: "Restart service containers in a Compose project.",
      inputSchema: {
        type: "object",
        properties: {
          file: { type: "string", description: "Path to docker-compose file in WSL" },
          project_name: { type: "string", description: "Project name" },
          services: {
            type: "array",
            items: { type: "string" },
            description: "Services to restart (default: all)",
          },
          timeout: { type: "number", description: "Specify a shutdown timeout in seconds (default 10)" },
        },
      },
    },
    handle: async (args) => {
      const cmd = composeBaseArgs(args);
      cmd.push("restart");
      if (args["timeout"] !== undefined) cmd.push("--timeout", str(args["timeout"]));
      cmd.push(...strArr(args["services"]));
      return execDocker(cmd);
    },
  },
];
