# Ebka Caido AI — MCP Server

MCP server for [Caido](https://caido.io/) — AI-powered security testing assistant with 30+ tools.

## Quick Start

### Via npx (Recommended)

No installation needed. Add to your Claude Desktop config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%AppData%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "caido": {
      "command": "npx",
      "args": ["-y", "ebka-caido-ai"],
      "env": {
        "CAIDO_BASE_URL": "http://localhost:8080"
      }
    }
  }
}
```

### For Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "caido": {
      "command": "npx",
      "args": ["-y", "ebka-caido-ai"],
      "env": {
        "CAIDO_BASE_URL": "http://localhost:8080"
      }
    }
  }
}
```

> **Note:** Update `CAIDO_BASE_URL` if Caido runs on a different port.

### From Source

```bash
git clone https://github.com/Slonser/Ebka-Caido-AI.git
cd Ebka-Caido-AI/claude-mcp-server
npm install
npm run build
```

Then use `node /path/to/build/index.js` as the command in your config.

## Authentication

Authentication is handled automatically via OAuth:

1. Start a conversation and try to use any Caido tool
2. Claude will detect that authentication is needed and prompt you
3. Use `authenticate` — you'll receive a verification URL
4. Open the URL in your browser and authorize
5. Use `check_authentication` to confirm — done!

## Requirements

- Node.js >= 18
- [Caido](https://caido.io/) running locally

## License

GPL-3.0
