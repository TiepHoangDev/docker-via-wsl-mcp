# docker-via-wsl MCP

MCP server that exposes full Docker CLI functionality to AI agents by proxying commands through WSL (Windows Subsystem for Linux).

## Requirements

- Windows with WSL2 installed
- Docker installed inside WSL (Ubuntu or any distro)
- Node.js 18+ (on Windows)

## Setup

```bash
npm install
npm run build
```

## Configuration

Config is loaded from environment variables first, then `config.json` (in project root) as fallback.

| Env Var | Default | Description |
|---------|---------|-------------|
| `WSL_DISTRO` | `Ubuntu` | WSL distro name |
| `DOCKER_PATH` | `docker` | Path to docker binary inside WSL |
| `CMD_TIMEOUT_MS` | `30000` | Command timeout in milliseconds |

**Optional `config.json`:**
```json
{
  "wslDistro": "Ubuntu",
  "dockerPath": "docker",
  "cmdTimeoutMs": 30000
}
```

## MCP Client Config

### Windsurf / Cursor (`mcp_config.json`)

```json
{
  "mcpServers": {
    "docker-via-wsl": {
      "command": "node",
      "args": ["D:/PROJECTS/docker-via-wsl-mcp/dist/index.js"],
      "env": {
        "WSL_DISTRO": "Ubuntu"
      }
    }
  }
}
```

### With `npx` (alternative, no pre-build needed)

```json
{
  "mcpServers": {
    "docker-via-wsl": {
      "command": "npx",
      "args": ["--yes", "tsx", "D:/PROJECTS/docker-via-wsl-mcp/src/index.ts"],
      "env": {
        "WSL_DISTRO": "Ubuntu"
      }
    }
  }
}
```

## Tools

### Containers (9 tools)
| Tool | Description |
|------|-------------|
| `docker_ps` | List containers |
| `docker_run` | Run a new container |
| `docker_start` | Start stopped containers |
| `docker_stop` | Stop running containers |
| `docker_restart` | Restart containers |
| `docker_rm` | Remove containers |
| `docker_exec` | Execute command in running container |
| `docker_logs` | Fetch container logs |
| `docker_inspect` | Inspect Docker objects |

### Images (7 tools)
| Tool | Description |
|------|-------------|
| `docker_images` | List images |
| `docker_pull` | Pull an image |
| `docker_push` | Push an image |
| `docker_build` | Build from Dockerfile |
| `docker_rmi` | Remove images |
| `docker_tag` | Tag an image |
| `docker_image_inspect` | Inspect images |

### Networks (6 tools)
| Tool | Description |
|------|-------------|
| `docker_network_ls` | List networks |
| `docker_network_create` | Create a network |
| `docker_network_rm` | Remove networks |
| `docker_network_inspect` | Inspect networks |
| `docker_network_connect` | Connect container to network |
| `docker_network_disconnect` | Disconnect container from network |

### Volumes (4 tools)
| Tool | Description |
|------|-------------|
| `docker_volume_ls` | List volumes |
| `docker_volume_create` | Create a volume |
| `docker_volume_rm` | Remove volumes |
| `docker_volume_inspect` | Inspect volumes |

### Compose (7 tools)
| Tool | Description |
|------|-------------|
| `docker_compose_up` | Start services |
| `docker_compose_down` | Stop and remove services |
| `docker_compose_ps` | List service containers |
| `docker_compose_logs` | View service logs |
| `docker_compose_build` | Build service images |
| `docker_compose_pull` | Pull service images |
| `docker_compose_restart` | Restart services |

### System (4 tools)
| Tool | Description |
|------|-------------|
| `docker_info` | System-wide info |
| `docker_version` | Docker version |
| `docker_system_df` | Disk usage |
| `docker_system_prune` | Remove unused data |

## Notes

- **WSL paths**: For `docker_build`, `docker_compose_*` — provide Linux-style paths (e.g. `/home/user/app`, not `C:\...`)
- **Timeouts**: Long operations like `docker_build` or `docker_compose_up` may need a higher `CMD_TIMEOUT_MS`
- **Non-interactive**: `docker_exec` runs non-interactively; avoid commands that require a TTY
