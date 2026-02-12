#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, } from "fs";
import { homedir } from "os";
import { join } from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { createClient } from "graphql-ws";
import WebSocket from "ws";
import { tools_description, tools_version } from "./tools.js";
// Token storage path
const TOKEN_DIR = join(homedir(), ".ebka-caido");
const TOKEN_FILE = join(TOKEN_DIR, "token.json");
// Configuration for connecting to Caido plugin
const CAIDO_CONFIG = {
    baseUrl: process.env.CAIDO_BASE_URL || "http://localhost:8080",
    authToken: process.env.CAIDO_AUTH_TOKEN || process.env.CAIDO_PAT,
};
// OAuth state
let pendingAuthRequest = null;
// Token received from background subscription
let receivedToken = null;
const debug = true;
// Logging function
function logToFile(message, level = "INFO") {
    if (!debug) {
        return;
    }
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    const logPath = join(homedir(), "tmp", "log-caido.txt");
    try {
        appendFileSync(logPath, logEntry, { encoding: "utf8" });
    }
    catch (error) {
        console.error(`Failed to write to log file: ${error}`);
    }
}
// --- Token persistence ---
function saveTokenToDisk(token) {
    try {
        if (!existsSync(TOKEN_DIR)) {
            mkdirSync(TOKEN_DIR, { recursive: true, mode: 0o700 });
        }
        const savedToken = {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: token.expiresAt,
            baseUrl: CAIDO_CONFIG.baseUrl,
            savedAt: new Date().toISOString(),
        };
        writeFileSync(TOKEN_FILE, JSON.stringify(savedToken, null, 2), {
            encoding: "utf8",
            mode: 0o600,
        });
        logToFile("Token saved to disk");
    }
    catch (error) {
        logToFile(`Failed to save token to disk: ${error}`, "ERROR");
    }
}
function loadTokenFromDisk() {
    try {
        if (!existsSync(TOKEN_FILE)) {
            logToFile("No saved token file found");
            return null;
        }
        const data = readFileSync(TOKEN_FILE, { encoding: "utf8" });
        const saved = JSON.parse(data);
        // Only load if the token was saved for the same Caido instance
        if (saved.baseUrl !== CAIDO_CONFIG.baseUrl) {
            logToFile(`Saved token is for ${saved.baseUrl}, current instance is ${CAIDO_CONFIG.baseUrl} — skipping`);
            return null;
        }
        logToFile("Loaded saved token from disk");
        return saved;
    }
    catch (error) {
        logToFile(`Failed to load token from disk: ${error}`, "ERROR");
        return null;
    }
}
function isTokenExpired(expiresAt) {
    if (!expiresAt)
        return false; // If no expiry, assume it's valid
    const expiry = new Date(expiresAt).getTime();
    const now = Date.now();
    // Consider expired if less than 5 minutes remain
    return now >= expiry - 5 * 60 * 1000;
}
// --- Refresh token flow ---
async function refreshAccessToken(refreshToken) {
    logToFile("Attempting to refresh access token");
    const graphqlQuery = {
        query: `mutation RefreshAuthenticationToken($refreshToken: Token!) {
      refreshAuthenticationToken(refreshToken: $refreshToken) {
        token {
          accessToken
          refreshToken
          expiresAt
        }
      }
    }`,
        variables: { refreshToken },
    };
    const response = await axios.post(`${CAIDO_CONFIG.baseUrl}/graphql`, graphqlQuery, { headers: { "Content-Type": "application/json" } });
    if (response.data.errors) {
        throw new Error(`Refresh failed: ${response.data.errors.map((e) => e.message).join("; ")}`);
    }
    const token = response.data.data?.refreshAuthenticationToken?.token;
    if (!token?.accessToken) {
        throw new Error("No token returned from refresh");
    }
    logToFile("Token refreshed successfully");
    return token;
}
// Ensure we have a valid token, refreshing if needed
async function ensureValidToken() {
    // If we have a token and it's not expired, we're good
    if (CAIDO_CONFIG.authToken && !isTokenExpired(receivedToken?.expiresAt)) {
        return true;
    }
    // Token is expired or missing — try to refresh
    const saved = receivedToken || loadTokenFromDisk();
    if (saved?.refreshToken) {
        try {
            const newToken = await refreshAccessToken(saved.refreshToken);
            CAIDO_CONFIG.authToken = newToken.accessToken;
            receivedToken = newToken;
            saveTokenToDisk(newToken);
            logToFile("Token refreshed and saved");
            return true;
        }
        catch (error) {
            logToFile(`Token refresh failed: ${error}`, "ERROR");
            // Clear stale token
            CAIDO_CONFIG.authToken = undefined;
            receivedToken = null;
            return false;
        }
    }
    return !!CAIDO_CONFIG.authToken;
}
// Function to get information about available plugins via GraphQL
async function getPluginInfo() {
    try {
        logToFile("Getting plugin info via GraphQL");
        const graphqlQuery = {
            operationName: "pluginPackages",
            query: `query pluginPackages {
        pluginPackages {
          ...pluginPackageFull
        }
      }
      fragment pluginAuthorFull on PluginAuthor {
        name
        email
        url
      }
      fragment pluginLinksFull on PluginLinks {
        sponsor
      }
      fragment pluginPackageMeta on PluginPackage {
        id
        name
        description
        author {
          ...pluginAuthorFull
        }
        links {
          ...pluginLinksFull
        }
        version
        installedAt
        manifestId
      }
      fragment pluginMeta on Plugin {
        __typename
        id
        name
        enabled
        manifestId
        package {
          id
        }
      }
      fragment pluginBackendMeta on PluginBackend {
        __typename
        id
      }
      fragment pluginFrontendFull on PluginFrontend {
        ...pluginMeta
        entrypoint
        style
        data
        backend {
          ...pluginBackendMeta
        }
      }
      fragment pluginBackendFull on PluginBackend {
        ...pluginMeta
        runtime
        state {
          error
          running
        }
      }
      fragment workflowMeta on Workflow {
        __typename
        id
        kind
        name
        enabled
        global
        readOnly
      }
      fragment pluginWorkflowFull on PluginWorkflow {
        ...pluginMeta
        name
        workflow {
          ...workflowMeta
        }
      }
      fragment pluginPackageFull on PluginPackage {
        ...pluginPackageMeta
        plugins {
          ... on PluginFrontend {
            ...pluginFrontendFull
          }
          ... on PluginBackend {
            ...pluginBackendFull
          }
          ... on PluginWorkflow {
            ...pluginWorkflowFull
          }
        }
      }`,
            variables: {},
        };
        logToFile(`Sending request to ${CAIDO_CONFIG.baseUrl}/graphql`);
        logToFile(`Using PAT: ${CAIDO_CONFIG.authToken ? CAIDO_CONFIG.authToken.substring(0, 20) + "..." : "NOT SET"}`);
        // Prepare headers - Authorization is optional for local instances
        const headers = {
            "Content-Type": "application/json",
        };
        // Only add Authorization if PAT is set (required for Cloud, optional for local)
        if (CAIDO_CONFIG.authToken) {
            headers["Authorization"] = `Bearer ${CAIDO_CONFIG.authToken}`;
        }
        const response = await axios.post(`${CAIDO_CONFIG.baseUrl}/graphql`, graphqlQuery, {
            headers,
        });
        // Check for GraphQL errors
        if (response.data.errors) {
            logToFile(`GraphQL errors: ${JSON.stringify(response.data.errors)}`, "ERROR");
            throw new Error(`GraphQL errors: ${response.data.errors.map((e) => e.message).join("; ")}`);
        }
        // Check if data is present
        if (!response.data.data) {
            logToFile(`No data in GraphQL response: ${JSON.stringify(response.data)}`, "ERROR");
            throw new Error("No data in GraphQL response");
        }
        logToFile(`Successfully retrieved ${response.data.data.pluginPackages?.length || 0} plugin packages`);
        return response.data.data.pluginPackages;
    }
    catch (error) {
        logToFile(`Failed to get plugin info: ${error}`, "ERROR");
        throw new Error(`Failed to get plugin info: ${error}`);
    }
}
// Function to find Caido plugin by name
async function findCaidoPlugin() {
    logToFile("Searching for Caido AI Assistant plugin");
    const pluginPackages = await getPluginInfo();
    if (pluginPackages && pluginPackages.length > 0) {
        const caidoPackage = pluginPackages.find((pkg) => pkg.name === "Ebka AI Assistant" || pkg.name?.includes("Ebka"));
        if (caidoPackage) {
            logToFile(`Found Caido package: ${caidoPackage.name} (ID: ${caidoPackage.id})`);
            // Find the backend plugin
            const backendPlugin = caidoPackage.plugins.find((plugin) => plugin.__typename === "PluginBackend");
            if (backendPlugin) {
                logToFile(`Found backend plugin: ${backendPlugin.name} (ID: ${backendPlugin.id})`);
                return backendPlugin.id;
            }
            logToFile("Caido AI Assistant backend plugin not found", "ERROR");
            throw new Error("Caido AI Assistant backend plugin not found");
        }
        logToFile("Caido AI Assistant plugin package not found", "ERROR");
        throw new Error("Caido AI Assistant plugin package not found");
    }
    logToFile("No plugin packages found", "ERROR");
    throw new Error("No plugin packages found");
}
async function callCaidoFunction(functionName, args) {
    logToFile(`Calling Caido function: ${functionName} with args: ${JSON.stringify(args)}`);
    const pluginId = await findCaidoPlugin();
    const url = `${CAIDO_CONFIG.baseUrl}/plugin/backend/${pluginId}/function`;
    // Prepare headers - Authorization is optional for local instances
    const headers = {
        "Content-Type": "application/json",
    };
    // Only add Authorization if PAT is set
    if (CAIDO_CONFIG.authToken) {
        headers["Authorization"] = `Bearer ${CAIDO_CONFIG.authToken}`;
    }
    const response = await axios.post(url, {
        name: functionName,
        args: args,
    }, {
        headers,
    });
    logToFile(`Function ${functionName} executed successfully`);
    return response.data;
}
// Start OAuth authentication flow
async function startAuthenticationFlow() {
    logToFile("Starting authentication flow via GraphQL");
    const graphqlQuery = {
        query: `mutation StartAuthenticationFlow {
      startAuthenticationFlow {
        request {
          id
          expiresAt
          userCode
          verificationUrl
        }
      }
    }`,
    };
    const headers = {
        "Content-Type": "application/json",
    };
    const response = await axios.post(`${CAIDO_CONFIG.baseUrl}/graphql`, graphqlQuery, { headers });
    if (response.data.errors) {
        logToFile(`GraphQL errors: ${JSON.stringify(response.data.errors)}`, "ERROR");
        throw new Error(`Failed to start auth flow: ${response.data.errors.map((e) => e.message).join("; ")}`);
    }
    const request = response.data.data?.startAuthenticationFlow?.request;
    if (!request) {
        throw new Error("No authentication request returned");
    }
    logToFile(`Auth flow started: ${request.id}`);
    pendingAuthRequest = {
        requestId: request.id,
        verificationUrl: request.verificationUrl,
        expiresAt: request.expiresAt,
    };
    // Start background subscription immediately
    receivedToken = null;
    startTokenSubscription(request.id);
    return request;
}
// Start background WebSocket subscription to listen for token
function startTokenSubscription(requestId) {
    const wsUrl = CAIDO_CONFIG.baseUrl.replace(/^http/, "ws") + "/ws/graphql";
    logToFile(`Starting background subscription at: ${wsUrl} for requestId: ${requestId}`);
    try {
        const client = createClient({
            url: wsUrl,
            webSocketImpl: WebSocket,
            connectionParams: () => {
                if (CAIDO_CONFIG.authToken) {
                    return { Authorization: `Bearer ${CAIDO_CONFIG.authToken}` };
                }
                return {};
            },
        });
        client.subscribe({
            query: `subscription CreatedAuthToken($requestId: ID!) {
          createdAuthenticationToken(requestId: $requestId) {
            token {
              expiresAt
              accessToken
              refreshToken
            }
          }
        }`,
            variables: { requestId },
        }, {
            next: (data) => {
                logToFile(`Subscription data received: ${JSON.stringify(data)}`);
                const token = data?.data?.createdAuthenticationToken?.token;
                if (token?.accessToken) {
                    logToFile("Token received via background subscription!");
                    CAIDO_CONFIG.authToken = token.accessToken;
                    receivedToken = token;
                    pendingAuthRequest = null;
                    saveTokenToDisk(token);
                    client.dispose();
                }
            },
            error: (err) => {
                logToFile(`Background subscription error: ${JSON.stringify(err)}`, "ERROR");
                client.dispose();
            },
            complete: () => {
                logToFile("Background subscription completed");
                client.dispose();
            },
        });
    }
    catch (error) {
        logToFile(`Failed to create background subscription: ${error}`, "ERROR");
    }
}
// Check if token has been received
function checkAuthenticationState() {
    if (receivedToken) {
        logToFile("Token already received from background subscription");
        return { ready: true, token: receivedToken };
    }
    return { ready: false, state: "WAITING" };
}
// MCP server instructions (system prompt)
const SERVER_INSTRUCTIONS = `You are helping the user with security testing using Caido.

Caido has the following modules:
- **Filters** - Used for creating filters that users can later use in search using preset:alias
- **Replay** - Consists of collections. Each collection contains sessions (requests). Users typically send interesting requests, and it's very important that both requests and collections are properly named so users don't get confused later.
- **Match/Replace (Tamper)** - Consists of collections. Each collection contains rules. Needed so users can automatically modify requests or responses. Like with Replay, it's important to maintain proper naming.
- **Findings** - Consists of discovered vulnerabilities. Users can create and view security findings.
- **Scopes** - Consists of scopes. Usually bug hunters and pentesters are limited to a certain scope, on which they have the right to send requests. So sometimes it can be useful.

IMPORTANT: The MCP server automatically manages authentication tokens:
- On startup, it loads saved tokens from disk and refreshes them if expired
- If no saved token is available, you MUST authenticate:
  1. Use the "authenticate" tool to start the OAuth flow - it will give the user a verification URL
  2. After the user confirms they've authorized, use "check_authentication" to complete the setup
- Once authenticated, tokens are saved to disk and reused across sessions automatically
- If a tool fails with an auth error, try "authenticate" again

After authenticating, check the tools version with "get_tools_version".`;
// Create MCP server
const server = new Server({
    name: "caido-mcp-server",
    version: "1.0.2",
}, {
    capabilities: {
        tools: {},
    },
    instructions: SERVER_INSTRUCTIONS,
});
// Register tools from tools.ts
server.setRequestHandler(ListToolsRequestSchema, () => {
    logToFile("Listing available tools");
    const tools = tools_description.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: {
            type: "object",
            properties: tool.input_schema.properties,
            required: tool.input_schema.required,
        },
    }));
    // Add authentication tools
    const authenticateTool = {
        name: "authenticate",
        description: "Start OAuth authentication flow with Caido. This will provide a verification URL for the user to authorize the connection.",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    };
    const checkAuthTool = {
        name: "check_authentication",
        description: "Check the status of pending authentication request. Use this after the user has completed the verification.",
        inputSchema: {
            type: "object",
            properties: {},
            required: [],
        },
    };
    return {
        tools: [authenticateTool, checkAuthTool, ...tools],
    };
});
// Tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logToFile(`Tool call requested: ${name} with arguments: ${JSON.stringify(args)}`);
    try {
        // Auto-refresh token before tool calls (except auth tools)
        if (name !== "authenticate" && name !== "check_authentication") {
            await ensureValidToken();
        }
        let result;
        if (name === "authenticate") {
            // Start OAuth flow
            const authRequest = await startAuthenticationFlow();
            return {
                content: [
                    {
                        type: "text",
                        text: `🔐 **Authentication Required**

Please complete the authentication by visiting this URL:
${authRequest.verificationUrl}

After you've completed the verification, use the \`check_authentication\` tool to complete the setup.

Request ID: ${authRequest.id}
Expires at: ${authRequest.expiresAt}`,
                    },
                ],
            };
        }
        if (name === "check_authentication") {
            if (!pendingAuthRequest && !receivedToken) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "❌ No pending authentication request. Please use the `authenticate` tool first.",
                        },
                    ],
                };
            }
            const authState = await checkAuthenticationState();
            if (authState.ready) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "✅ Authentication successful! You can now use Caido tools.",
                        },
                    ],
                };
            }
            else {
                return {
                    content: [
                        {
                            type: "text",
                            text: `⏳ Authentication pending (state: ${authState.state || "WAITING"}). Please complete the verification at:\n${pendingAuthRequest?.verificationUrl || "N/A"}\n\nThen run this tool again.`,
                        },
                    ],
                };
            }
        }
        if (name === "sendAuthToken") {
            // Keep for backward compatibility
            const params = args || "";
            logToFile(`Args: ${JSON.stringify(args)}`);
            logToFile(`Params: ${JSON.stringify(params)}`);
            // @ts-ignore
            const pat = params.pat || "";
            // @ts-ignore
            const apiEndpoint = params.api_endpoint || "";
            logToFile(`Configuring connection with endpoint: ${apiEndpoint}`);
            // Update configuration - use provided PAT or keep existing
            if (pat) {
                CAIDO_CONFIG.authToken = pat;
            }
            // @ts-ignore
            CAIDO_CONFIG.baseUrl = apiEndpoint.replace(/\/graphql$/, "");
            // Test connection by getting plugin info
            const pluginId = await findCaidoPlugin();
            result = {
                success: true,
                message: "PAT and API endpoint configured successfully",
                pluginId: pluginId,
                pluginName: "Ebka AI Assistant",
            };
            logToFile(`Connection configured successfully. Plugin ID: ${pluginId}`);
        }
        else if (name === "get_plugin_info") {
            // Get plugin information
            result = await getPluginInfo();
        }
        else {
            // Call regular function in Caido plugin
            // In MCP calls, args already contains the parameters object
            const params = JSON.stringify(args) || {};
            result = await callCaidoFunction("claudeDesktop", [
                JSON.stringify(name),
                JSON.stringify(params),
            ]);
            if (name === "get_tools_version") {
                result.client_info += `\nMCP tools version: ${tools_version}`;
            }
        }
        logToFile(`Tool ${name} executed successfully`);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        logToFile(`Error executing tool ${name}: ${error}`, "ERROR");
        // Check if this is an authentication error
        const errorMessage = error?.message || String(error);
        const isAuthError = errorMessage.includes("401") ||
            errorMessage.includes("Unauthorized") ||
            errorMessage.includes("authentication") ||
            errorMessage.includes("No plugin packages found");
        if (isAuthError &&
            !CAIDO_CONFIG.authToken &&
            name !== "authenticate" &&
            name !== "check_authentication") {
            // Automatically suggest authentication
            return {
                content: [
                    {
                        type: "text",
                        text: `❌ Authentication required to use Caido tools.

Error: ${errorMessage}

Please use the \`authenticate\` tool to start the OAuth authentication flow.`,
                    },
                ],
                isError: true,
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Error calling Caido function ${name}: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});
// Start server
async function main() {
    logToFile("Starting Caido MCP Server");
    // Try to load saved token on startup
    if (!CAIDO_CONFIG.authToken) {
        const saved = loadTokenFromDisk();
        if (saved) {
            if (isTokenExpired(saved.expiresAt) && saved.refreshToken) {
                logToFile("Saved token is expired, attempting refresh...");
                try {
                    const newToken = await refreshAccessToken(saved.refreshToken);
                    CAIDO_CONFIG.authToken = newToken.accessToken;
                    receivedToken = newToken;
                    saveTokenToDisk(newToken);
                    logToFile("Token refreshed on startup");
                }
                catch (error) {
                    logToFile(`Token refresh on startup failed: ${error}`, "ERROR");
                }
            }
            else {
                CAIDO_CONFIG.authToken = saved.accessToken;
                receivedToken = saved;
                logToFile("Using saved token from disk");
            }
        }
    }
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logToFile("Caido MCP Server started successfully");
    console.error("Caido MCP Server started");
}
main().catch((error) => {
    logToFile(`Failed to start server: ${error}`, "ERROR");
    console.error("Failed to start server:", error);
    process.exit(1);
});
