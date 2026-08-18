# PREflight MCP

stdio server. Tools call the same deterministic engine as the UI.

```bash
pnpm mcp
```

```toml
# ~/.grok/config.toml
[mcp_servers.preflight]
command = "npx"
args = ["tsx", "mcp/server.ts"]
```

Tools:

- `preflight_check`
- `preflight_policy`
- `preflight_history`
