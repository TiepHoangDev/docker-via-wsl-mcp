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

export const imageTools: ToolHandler[] = [
  {
    tool: {
      name: "docker_images",
      description: "List Docker images.",
      inputSchema: {
        type: "object",
        properties: {
          repository: { type: "string", description: "Filter by repository name" },
          all: { type: "boolean", description: "Show all images (including intermediate)" },
          format: { type: "string", description: "Pretty-print using a Go template" },
          filter: { type: "string", description: "Filter output based on conditions" },
          digests: { type: "boolean", description: "Show digests" },
        },
      },
    },
    handle: async (args) => {
      const cmd = ["images"];
      if (bool(args["all"])) cmd.push("--all");
      if (bool(args["digests"])) cmd.push("--digests");
      if (args["filter"]) cmd.push("--filter", str(args["filter"]));
      if (args["format"]) cmd.push("--format", str(args["format"]));
      if (args["repository"]) cmd.push(str(args["repository"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_pull",
      description: "Pull an image or a repository from a registry.",
      inputSchema: {
        type: "object",
        properties: {
          image: { type: "string", description: "Image name (and optional tag) to pull (required)" },
          platform: { type: "string", description: "Set platform if server is multi-platform capable (e.g. 'linux/amd64')" },
          all_tags: { type: "boolean", description: "Download all tagged images in the repository" },
        },
        required: ["image"],
      },
    },
    handle: async (args) => {
      const cmd = ["pull"];
      if (bool(args["all_tags"])) cmd.push("--all-tags");
      if (args["platform"]) cmd.push("--platform", str(args["platform"]));
      cmd.push(str(args["image"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_push",
      description: "Push an image or a repository to a registry.",
      inputSchema: {
        type: "object",
        properties: {
          image: { type: "string", description: "Image name (and optional tag) to push (required)" },
          all_tags: { type: "boolean", description: "Push all tagged images in the repository" },
        },
        required: ["image"],
      },
    },
    handle: async (args) => {
      const cmd = ["push"];
      if (bool(args["all_tags"])) cmd.push("--all-tags");
      cmd.push(str(args["image"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_build",
      description: "Build a Docker image from a Dockerfile. Paths must be WSL-style (e.g. /home/user/myapp).",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Build context path in WSL (required)" },
          tag: { type: "string", description: "Name and optionally a tag (format: name:tag)" },
          dockerfile: { type: "string", description: "Path to the Dockerfile (relative to context)" },
          build_args: {
            type: "array",
            items: { type: "string" },
            description: "Build arguments e.g. ['KEY=VALUE']",
          },
          no_cache: { type: "boolean", description: "Do not use cache when building" },
          target: { type: "string", description: "Set the target build stage" },
          platform: { type: "string", description: "Set platform (e.g. 'linux/amd64')" },
          pull: { type: "boolean", description: "Always attempt to pull a newer version of the image" },
          quiet: { type: "boolean", description: "Suppress the build output" },
        },
        required: ["path"],
      },
    },
    handle: async (args) => {
      const cmd = ["build"];
      if (args["tag"]) cmd.push("--tag", str(args["tag"]));
      if (args["dockerfile"]) cmd.push("--file", str(args["dockerfile"]));
      if (bool(args["no_cache"])) cmd.push("--no-cache");
      if (bool(args["pull"])) cmd.push("--pull");
      if (bool(args["quiet"])) cmd.push("--quiet");
      if (args["target"]) cmd.push("--target", str(args["target"]));
      if (args["platform"]) cmd.push("--platform", str(args["platform"]));
      for (const a of strArr(args["build_args"])) cmd.push("--build-arg", a);
      cmd.push(str(args["path"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_rmi",
      description: "Remove one or more Docker images.",
      inputSchema: {
        type: "object",
        properties: {
          images: {
            type: "array",
            items: { type: "string" },
            description: "Image names or IDs to remove (required)",
          },
          force: { type: "boolean", description: "Force removal of the image" },
          no_prune: { type: "boolean", description: "Do not delete untagged parents" },
        },
        required: ["images"],
      },
    },
    handle: async (args) => {
      const cmd = ["rmi"];
      if (bool(args["force"])) cmd.push("--force");
      if (bool(args["no_prune"])) cmd.push("--no-prune");
      cmd.push(...strArr(args["images"]));
      return execDocker(cmd);
    },
  },

  {
    tool: {
      name: "docker_tag",
      description: "Create a tag TARGET_IMAGE that refers to SOURCE_IMAGE.",
      inputSchema: {
        type: "object",
        properties: {
          source: { type: "string", description: "Source image name (required)" },
          target: { type: "string", description: "Target image name (required)" },
        },
        required: ["source", "target"],
      },
    },
    handle: async (args) => {
      return execDocker(["tag", str(args["source"]), str(args["target"])]);
    },
  },

  {
    tool: {
      name: "docker_image_inspect",
      description: "Display detailed information on one or more images.",
      inputSchema: {
        type: "object",
        properties: {
          images: {
            type: "array",
            items: { type: "string" },
            description: "Image names or IDs to inspect (required)",
          },
          format: { type: "string", description: "Go template format string" },
        },
        required: ["images"],
      },
    },
    handle: async (args) => {
      const cmd = ["image", "inspect"];
      if (args["format"]) cmd.push("--format", str(args["format"]));
      cmd.push(...strArr(args["images"]));
      return execDocker(cmd);
    },
  },
];
