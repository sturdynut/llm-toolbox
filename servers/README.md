# MCP servers

Development tree for MCP servers. Each subdirectory is an independent npm package.

## Conventions

Matching the existing `tradingview-mcp`:

- Node ESM (`"type": "module"`), no transpile step — plain `src/*.js`
- `@modelcontextprotocol/sdk`
- `node --test` for tests
- a `bin` entry, so the server is runnable via `npx`

```
servers/<name>/
├── package.json      # name: @matti/<name>-mcp, type: module, bin
├── src/server.js
└── tests/*.test.js
```

## How plugins consume them

By **published package**, not by relative path:

```json
{
  "mcpServers": {
    "<name>": { "command": "npx", "args": ["-y", "@matti/<name>-mcp"] }
  }
}
```

A relative path from `plugins/x/.mcp.json` into this directory only resolves while the
whole repo happens to be on disk, and breaks outright if a plugin is ever distributed via
a `git-subdir` source. This tree is where servers are developed; plugins depend on the
published artifact.
