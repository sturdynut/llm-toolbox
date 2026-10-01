---
description: Conventions for MCP servers in servers/ — Node ESM with no transpile step, @modelcontextprotocol/sdk, node --test, @matti/<name>-mcp package naming, bin entries, and why plugins reference the published package instead of a relative path.
---
- Layout: `servers/<name>/{package.json, src/server.js, tests/*.test.js}`; `"type": "module"`.
- Plugins reference servers via `npx -y @matti/<name>-mcp`, never `../../servers/...`: relative paths break under `git-subdir` distribution.
- Only build an MCP tool when the job needs code, auth, or network that Bash/Read can't reach.
- Full conventions: `servers/README.md`.
