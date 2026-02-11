# Ebka AI

<div align="center">

_A powerful AI-powered assistant for Caido web application security testing, built with Claude AI_

[![npm version](https://img.shields.io/npm/v/ebka-caido-ai)](https://www.npmjs.com/package/ebka-caido-ai)
[![GitHub forks](https://img.shields.io/github/forks/Slonser/Ebka-Caido-AI?style=social)](https://github.com/Slonser/Ebka-Caido-AI/network/members)
[![GitHub issues](https://img.shields.io/github/issues/Slonser/Ebka-Caido-AI)](https://github.com/Slonser/Ebka-Caido-AI/issues)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/Slonser/Ebka-Caido-AI)](https://github.com/Slonser/Ebka-Caido-AI/releases)
[![GitHub stars](https://img.shields.io/github/stars/Slonser/Ebka-Caido-AI?style=social)](https://github.com/Slonser/Ebka-Caido-AI/stargazers)
[![License](https://img.shields.io/github/license/Slonser/Ebka-Caido-AI?branch=main)](https://github.com/Slonser/Ebka-Caido-AI/blob/main/LICENSE)

[Report Bug](https://github.com/Slonser/Ebka-Caido-AI/issues) •
[Request Feature](https://github.com/Slonser/Ebka-Caido-AI/issues)

![Claude Desktop Integration](./static/claude-desktop.jpg)
*Claude Desktop Integration*

</div>

---

- [Ebka AI](#ebka-ai)
  - [Overview](#overview)
  - [Features](#features)
    - [**Request Analysis \& Search**](#request-analysis--search)
    - [**Replay Session Management**](#replay-session-management)
    - [**Security Findings Management**](#security-findings-management)
    - [**Match/Replace Rules**](#matchreplace-rules)
    - [**Filters**](#filters)
    - [**Scopes**](#scopes)
    - [**AI-Powered Intelligence**](#ai-powered-intelligence)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
    - [Method 1 - Claude Desktop via npx (Recommended)](#method-1---claude-desktop-via-npx-recommended)
    - [Method 2 - Claude Desktop from Source](#method-2---claude-desktop-from-source)
    - [Method 3 - Direct API Access (Requires API Key)](#method-3---direct-api-access-requires-api-key)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites-1)
    - [Install from source:](#install-from-source)
  - [Usage](#usage)
  - [Contributing](#contributing)
  - [License](#license)

## Overview

Ebka AI is an AI-powered assistant that integrates seamlessly with Caido, providing intelligent security testing capabilities through natural language commands and automated workflows. Built with Claude AI, it offers advanced HTTPQL query search, match/replace operations, replay session management, and AI-powered security analysis.

---

## Features

Ebka AI provides **30+ powerful Claude tools** for Caido:

### **Request Analysis & Search**
- **HTTPQL Query Search**: Advanced filtering and analysis using HTTPQL syntax
- **Request/Response Viewing**: Inspect individual requests and responses by ID
- **Custom Request Sending**: Send HTTP requests with full control over headers, body, and parameters
- **WebSocket Stream Management**: Read and analyze WebSocket streams

### **Replay Session Management**
- **Replay Collections**: Create, list, and manage replay session collections
- **Session Operations**: Rename sessions, move between collections, and execute automated testing
- **Connection Management**: Monitor and analyze replay connections and requests

### **Security Findings Management**
- **Findings CRUD**: Create, read, update, and delete security findings
- **Advanced Filtering**: List findings with pagination, filtering, and sorting
- **Comprehensive Data**: Access detailed finding information including request/response bodies

### **Match/Replace Rules**
- **Tamper Rule Collections**: Organize and manage rule collections
- **Rule Management**: Create, update, and manage sophisticated find/replace operations
- **Advanced Filtering**: Search and filter rules by collection and criteria

### **Filters**
- **Create and update Filters**

### **Scopes**
- **Full scope management**: CRUD scopes, use created scopes in HTTPQL
  
### **AI-Powered Intelligence**
- **Claude Integration**: Leverage Claude AI for intelligent security insights
- **Natural Language**: Interact with security tools using natural language commands
- **Automated Workflows**: Streamline security testing with AI-assisted automation

## Prerequisites

- [Caido](https://caido.io/) web application security testing platform
- [Node.js](https://nodejs.org/) (version 18 or higher) — for MCP server
- For Direct Usage: Claude API key from [Anthropic Console](https://console.anthropic.com/settings/keys)

---

## Getting Started

There are multiple ways to interact with the Caido AI Assistant:

### Method 1 - Claude Desktop via npx (Recommended)

The easiest way to get started. No need to clone the repository or build anything.

**Add to your `claude_desktop_config.json`:**

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

> **Note:** If Caido is running on a different port, update `CAIDO_BASE_URL` accordingly (e.g., `http://localhost:8081`).

**Authenticate with Caido:**
1. Open Claude Desktop and start a conversation
2. When you try to use any Caido tool, Claude will automatically detect that authentication is required
3. Use the `authenticate` tool to start the OAuth flow
4. Claude will provide a verification URL — click it to authorize in your browser
5. After authorizing, use the `check_authentication` tool to complete the setup
6. The MCP server will automatically manage your authentication token

**That's it!** You can now communicate with Caido through Claude.

![Claude Desktop Integration](./static/claude-init.png)
*Claude Desktop Integration*

### Method 2 - Claude Desktop from Source

If you prefer to build from source:

1. **Clone and build:**
   ```bash
   git clone https://github.com/Slonser/Ebka-Caido-AI.git
   cd Ebka-Caido-AI/claude-mcp-server
   npm install
   npm run build
   ```

2. **Add to `claude_desktop_config.json`:**
   ```json
   {
     "mcpServers": {
       "caido": {
         "command": "node",
         "args": ["/path/to/Ebka-Caido-AI/claude-mcp-server/build/index.js"],
         "env": {
           "CAIDO_BASE_URL": "http://localhost:8080"
         }
       }
     }
   }
   ```
   Replace `/path/to/` with the actual path to your cloned repository.

3. **Follow the same authentication steps** as described in Method 1.

### Method 3 - Direct API Access (Requires API Key)

1. **Enter your API KEY** in the plugin tab
2. **Use the functionality directly** from Caido without Claude Desktop

![Direct Caido Integration](./static/claude-caido.png)
*Direct Caido Integration*

---

## Installation

### Prerequisites

- [Caido](https://caido.io/) (latest version)
- [Node.js](https://nodejs.org/) (version 18 or higher)
- npm or pnpm package manager

### Install from source:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Slonser/Ebka-Caido-AI.git
   cd Ebka-Caido-AI
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   # or if using npm:
   # npm install
   ```

3. **Build the project:**
   ```bash
   pnpm build
   # or if using npm:
   # npm run build
   ```

4. **Install in Caido:**
   - Open Caido
   - Go to Settings > Plugins
   - Click "Install from file"
   - Select the built plugin file from the appropriate directory

---

## Usage

1. **Access Ebka AI:**
   - After installation, find "Ebka AI" in your Caido sidebar
   - Click to open the AI assistant interface

2. **Configure your settings:**
   - Enter your Claude API key for direct usage
   - Configure Claude Desktop integration if using the MCP server
   - Set up your preferred security testing workflows

3. **Use AI-powered features:**
   - Ask natural language questions about your security testing
   - Use HTTPQL queries to search through requests
   - Create and manage match/replace rules
   - Execute replay sessions and collections
   - Generate security findings with AI assistance

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
Made with ❤️ for the Caido community and security researchers
</div>
