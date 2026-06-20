#!/usr/bin/env node

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { homedir } from "os";
import { join } from "path";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { createClient } from "graphql-ws";
import WebSocket from "ws";

import { tools_description, tools_version } from "./tools.js";

// Token storage path
const TOKEN_DIR = join(homedir(), ".ebka-caido");
const TOKEN_FILE = join(TOKEN_DIR, "token.json");

// Saved token structure
interface SavedToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  baseUrl: string;
  savedAt: string;
}

// Configuration for connecting to Caido plugin
const CAIDO_CONFIG = {
  baseUrl: process.env.CAIDO_BASE_URL || "http://localhost:8080",
  authToken: process.env.CAIDO_AUTH_TOKEN || process.env.CAIDO_PAT,
};

// OAuth state
let pendingAuthRequest: {
  requestId: string;
  verificationUrl: string;
  expiresAt: string;
} | null = null;

// Token received from background subscription
let receivedToken: any = null;

const debug = true;
// Logging function
function logToFile(message: string, level: string = "INFO") {
  if (!debug) {
    return;
  }
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}\n`;
  const logPath = join(homedir(), "tmp", "log-caido.txt");

  try {
    appendFileSync(logPath, logEntry, { encoding: "utf8" });
  } catch (error) {
    console.error(`Failed to write to log file: ${error}`);
  }
}

// --- Token persistence ---

function saveTokenToDisk(token: any): void {
  try {
    if (!existsSync(TOKEN_DIR)) {
      mkdirSync(TOKEN_DIR, { recursive: true, mode: 0o700 });
    }
    const savedToken: SavedToken = {
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
  } catch (error) {
    logToFile(`Failed to save token to disk: ${error}`, "ERROR");
  }
}

function loadTokenFromDisk(): SavedToken | null {
  try {
    if (!existsSync(TOKEN_FILE)) {
      logToFile("No saved token file found");
      return null;
    }
    const data = readFileSync(TOKEN_FILE, { encoding: "utf8" });
    const saved: SavedToken = JSON.parse(data);

    // Only load if the token was saved for the same Caido instance
    if (saved.baseUrl !== CAIDO_CONFIG.baseUrl) {
      logToFile(
        `Saved token is for ${saved.baseUrl}, current instance is ${CAIDO_CONFIG.baseUrl} — skipping`,
      );
      return null;
    }

    logToFile("Loaded saved token from disk");
    return saved;
  } catch (error) {
    logToFile(`Failed to load token from disk: ${error}`, "ERROR");
    return null;
  }
}

function isTokenExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false; // If no expiry, assume it's valid
  const expiry = new Date(expiresAt).getTime();
  const now = Date.now();
  // Consider expired if less than 5 minutes remain
  return now >= expiry - 5 * 60 * 1000;
}

// --- Refresh token flow ---

async function refreshAccessToken(refreshToken: string): Promise<any> {
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

  const response = await axios.post(
    `${CAIDO_CONFIG.baseUrl}/graphql`,
    graphqlQuery,
    { headers: { "Content-Type": "application/json" } },
  );

  if (response.data.errors) {
    throw new Error(
      `Refresh failed: ${response.data.errors.map((e: any) => e.message).join("; ")}`,
    );
  }

  const token = response.data.data?.refreshAuthenticationToken?.token;
  if (!token?.accessToken) {
    throw new Error("No token returned from refresh");
  }

  logToFile("Token refreshed successfully");
  return token;
}

// Ensure we have a valid token, refreshing if needed
async function ensureValidToken(): Promise<boolean> {
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
    } catch (error) {
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
async function getPluginInfo(): Promise<any> {
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
    logToFile(
      `Using PAT: ${CAIDO_CONFIG.authToken ? CAIDO_CONFIG.authToken.substring(0, 20) + "..." : "NOT SET"}`,
    );

    // Prepare headers - Authorization is optional for local instances
    const headers: any = {
      "Content-Type": "application/json",
    };

    // Only add Authorization if PAT is set (required for Cloud, optional for local)
    if (CAIDO_CONFIG.authToken) {
      headers["Authorization"] = `Bearer ${CAIDO_CONFIG.authToken}`;
    }

    const response = await axios.post(
      `${CAIDO_CONFIG.baseUrl}/graphql`,
      graphqlQuery,
      {
        headers,
      },
    );

    // Check for GraphQL errors
    if (response.data.errors) {
      logToFile(
        `GraphQL errors: ${JSON.stringify(response.data.errors)}`,
        "ERROR",
      );
      throw new Error(
        `GraphQL errors: ${response.data.errors.map((e: any) => e.message).join("; ")}`,
      );
    }

    // Check if data is present
    if (!response.data.data) {
      logToFile(
        `No data in GraphQL response: ${JSON.stringify(response.data)}`,
        "ERROR",
      );
      throw new Error("No data in GraphQL response");
    }

    logToFile(
      `Successfully retrieved ${response.data.data.pluginPackages?.length || 0} plugin packages`,
    );
    return response.data.data.pluginPackages;
  } catch (error) {
    logToFile(`Failed to get plugin info: ${error}`, "ERROR");
    throw new Error(`Failed to get plugin info: ${error}`);
  }
}

// Function to find Caido plugin by name
async function findCaidoPlugin(): Promise<string> {
  logToFile("Searching for Caido AI Assistant plugin");
  const pluginPackages = await getPluginInfo();
  if (pluginPackages && pluginPackages.length > 0) {
    logToFile(
      `Found ${pluginPackages.length} packages: ${pluginPackages.map((p: any) => `${p.name} (${p.manifestId})`).join(", ")}`,
    );

    const caidoPackage = pluginPackages.find(
      (pkg: any) =>
        pkg.name === "Ebka AI Assistant" ||
        pkg.name?.includes("Ebka") ||
        pkg.manifestId === "ebka-ai-assistant" ||
        pkg.manifestId?.includes("ebka"),
    );

    if (caidoPackage) {
      logToFile(
        `Found Caido package: ${caidoPackage.name} (ID: ${caidoPackage.id}, manifest: ${caidoPackage.manifestId})`,
      );
      // Find the backend plugin
      const backendPlugin = caidoPackage.plugins.find(
        (plugin: any) => plugin.__typename === "PluginBackend",
      );

      if (backendPlugin) {
        logToFile(
          `Found backend plugin: ${backendPlugin.name} (ID: ${backendPlugin.id})`,
        );
        return backendPlugin.id;
      }
      logToFile("Caido AI Assistant backend plugin not found", "ERROR");
      throw new Error("Caido AI Assistant backend plugin not found");
    }
    logToFile(
      `Caido AI Assistant plugin not found among: ${pluginPackages.map((p: any) => p.name).join(", ")}`,
      "ERROR",
    );
    throw new Error(
      `Caido AI Assistant plugin package not found. Available: ${pluginPackages.map((p: any) => p.name).join(", ")}`,
    );
  }
  logToFile("No plugin packages found", "ERROR");
  throw new Error("No plugin packages found");
}

async function callCaidoFunction(
  functionName: string,
  args: any[],
): Promise<any> {
  logToFile(
    `Calling Caido function: ${functionName} with args: ${JSON.stringify(args)}`,
  );
  const pluginId = await findCaidoPlugin();
  const url = `${CAIDO_CONFIG.baseUrl}/plugin/backend/${pluginId}/function`;

  // Prepare headers - Authorization is optional for local instances
  const headers: any = {
    "Content-Type": "application/json",
  };

  // Only add Authorization if PAT is set
  if (CAIDO_CONFIG.authToken) {
    headers["Authorization"] = `Bearer ${CAIDO_CONFIG.authToken}`;
  }

  const response = await axios.post(
    url,
    {
      name: functionName,
      args: args,
    },
    {
      headers,
    },
  );

  logToFile(`Function ${functionName} executed successfully`);
  return response.data;
}

const WORKFLOW_FIELDS = `
  fragment workflowFields on Workflow {
    id
    name
    kind
    enabled
    global
    readOnly
    definition
    createdAt
    updatedAt
  }
`;

const UNKNOWN_OR_OTHER_ERROR_FIELDS = `
  __typename
  ... on UnknownIdUserError {
    id
    code
  }
  ... on OtherUserError {
    code
  }
`;

const OTHER_ERROR_FIELDS = `
  __typename
  ... on OtherUserError {
    code
  }
`;

const WORKFLOW_USER_ERROR_FIELDS = `
  ... on WorkflowUserError {
    code
    reason
    node
    message
  }
`;

const PERMISSION_DENIED_ERROR_FIELDS = `
  ... on PermissionDeniedUserError {
    code
    reason
  }
`;

const READ_ONLY_ERROR_FIELDS = `
  ... on ReadOnlyUserError {
    code
  }
`;

const directWorkflowTools = new Set([
  "create_workflow",
  "update_workflow",
  "rename_workflow",
  "delete_workflow",
  "globalize_workflow",
  "localize_workflow",
  "toggle_workflow",
]);

async function executeCaidoGraphQL(
  query: string,
  variables: Record<string, unknown>,
): Promise<any> {
  const headers: any = {
    "Content-Type": "application/json",
  };

  if (CAIDO_CONFIG.authToken) {
    headers["Authorization"] = `Bearer ${CAIDO_CONFIG.authToken}`;
  }

  const response = await axios.post(
    `${CAIDO_CONFIG.baseUrl}/graphql`,
    { query, variables },
    { headers },
  );

  if (response.data.errors) {
    return {
      success: false,
      error: response.data.errors,
      summary: "GraphQL operation failed",
    };
  }

  return {
    success: true,
    data: response.data.data,
  };
}

function parseWorkflowDefinition(definition: any): any {
  return typeof definition === "string" ? JSON.parse(definition) : definition;
}

function workflowPayloadError(payload: any, fallback: any): any {
  return payload?.error || fallback || "Workflow operation failed";
}

async function executeDirectWorkflowTool(name: string, input: any): Promise<any> {
  if (name === "create_workflow") {
    if (!input?.definition) {
      return {
        success: false,
        error: "Workflow definition is required",
        summary: "Please provide a workflow definition object or JSON string",
      };
    }

    const query = `
      mutation createWorkflow($input: CreateWorkflowInput!) {
        createWorkflow(input: $input) {
          workflow {
            ...workflowFields
          }
          error {
            ${WORKFLOW_USER_ERROR_FIELDS}
            ${PERMISSION_DENIED_ERROR_FIELDS}
            ${OTHER_ERROR_FIELDS}
          }
        }
      }
      ${WORKFLOW_FIELDS}
    `;
    const result = await executeCaidoGraphQL(query, {
      input: {
        definition: parseWorkflowDefinition(input.definition),
        global: input.global === true,
      },
    });
    const payload = result.data?.createWorkflow;
    if (!result.success || payload?.error || !payload?.workflow) {
      return {
        success: false,
        error: workflowPayloadError(payload, result.error),
        summary: "Failed to create workflow",
      };
    }
    return {
      success: true,
      workflow: payload.workflow,
      workflow_id: payload.workflow.id,
      summary: `Created workflow ${payload.workflow.id}: ${payload.workflow.name}`,
    };
  }

  if (name === "update_workflow") {
    if (!input?.id || !input?.definition) {
      return {
        success: false,
        error: "Workflow ID and definition are required",
        summary: "Please provide id and definition",
      };
    }

    const query = `
      mutation updateWorkflow($id: ID!, $input: UpdateWorkflowInput!) {
        updateWorkflow(id: $id, input: $input) {
          workflow {
            ...workflowFields
          }
          error {
            ${WORKFLOW_USER_ERROR_FIELDS}
            ${READ_ONLY_ERROR_FIELDS}
            ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
          }
        }
      }
      ${WORKFLOW_FIELDS}
    `;
    const result = await executeCaidoGraphQL(query, {
      id: input.id,
      input: { definition: parseWorkflowDefinition(input.definition) },
    });
    const payload = result.data?.updateWorkflow;
    if (!result.success || payload?.error || !payload?.workflow) {
      return {
        success: false,
        error: workflowPayloadError(payload, result.error),
        summary: `Failed to update workflow ${input.id}`,
      };
    }
    return {
      success: true,
      workflow: payload.workflow,
      summary: `Updated workflow ${payload.workflow.id}: ${payload.workflow.name}`,
    };
  }

  if (name === "rename_workflow") {
    if (!input?.id || !input?.name) {
      return {
        success: false,
        error: "Workflow ID and new name are required",
        summary: "Please provide id and name",
      };
    }

    const query = `
      mutation renameWorkflow($id: ID!, $name: String!) {
        renameWorkflow(id: $id, name: $name) {
          workflow {
            ...workflowFields
          }
          error {
            ${READ_ONLY_ERROR_FIELDS}
            ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
          }
        }
      }
      ${WORKFLOW_FIELDS}
    `;
    const result = await executeCaidoGraphQL(query, {
      id: input.id,
      name: input.name,
    });
    const payload = result.data?.renameWorkflow;
    if (!result.success || payload?.error || !payload?.workflow) {
      return {
        success: false,
        error: workflowPayloadError(payload, result.error),
        summary: `Failed to rename workflow ${input.id}`,
      };
    }
    return {
      success: true,
      workflow: payload.workflow,
      summary: `Renamed workflow ${payload.workflow.id} to ${payload.workflow.name}`,
    };
  }

  if (name === "delete_workflow") {
    if (!input?.id) {
      return {
        success: false,
        error: "Workflow ID is required",
        summary: "Please provide a workflow ID",
      };
    }

    const query = `
      mutation deleteWorkflow($id: ID!) {
        deleteWorkflow(id: $id) {
          deletedId
          error {
            ${READ_ONLY_ERROR_FIELDS}
            ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
          }
        }
      }
    `;
    const result = await executeCaidoGraphQL(query, { id: input.id });
    const payload = result.data?.deleteWorkflow;
    if (!result.success || payload?.error || !payload?.deletedId) {
      return {
        success: false,
        error: workflowPayloadError(payload, result.error),
        summary: `Failed to delete workflow ${input.id}`,
      };
    }
    return {
      success: true,
      deleted_id: payload.deletedId,
      summary: `Deleted workflow ${payload.deletedId}`,
    };
  }

  if (name === "globalize_workflow" || name === "localize_workflow") {
    if (!input?.id) {
      return {
        success: false,
        error: "Workflow ID is required",
        summary: "Please provide a workflow ID",
      };
    }

    const operationName =
      name === "globalize_workflow" ? "globalizeWorkflow" : "localizeWorkflow";
    const query = `
      mutation ${operationName}($id: ID!) {
        ${operationName}(id: $id) {
          workflow {
            ...workflowFields
          }
          error {
            ${WORKFLOW_USER_ERROR_FIELDS}
            ${READ_ONLY_ERROR_FIELDS}
            ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
          }
        }
      }
      ${WORKFLOW_FIELDS}
    `;
    const result = await executeCaidoGraphQL(query, { id: input.id });
    const payload = result.data?.[operationName];
    if (!result.success || payload?.error || !payload?.workflow) {
      return {
        success: false,
        error: workflowPayloadError(payload, result.error),
        summary: `Failed to ${operationName === "globalizeWorkflow" ? "globalize" : "localize"} workflow ${input.id}`,
      };
    }
    return {
      success: true,
      workflow: payload.workflow,
      summary: `Workflow ${payload.workflow.id} is now ${payload.workflow.global ? "global" : "local"}`,
    };
  }

  if (name === "toggle_workflow") {
    if (!input?.id || typeof input.enabled !== "boolean") {
      return {
        success: false,
        error: "Workflow ID and boolean enabled value are required",
        summary: "Please provide id and enabled",
      };
    }

    const query = `
      mutation toggleWorkflow($id: ID!, $enabled: Boolean!) {
        toggleWorkflow(id: $id, enabled: $enabled) {
          workflow {
            ...workflowFields
          }
          error {
            ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
          }
        }
      }
      ${WORKFLOW_FIELDS}
    `;
    const result = await executeCaidoGraphQL(query, {
      id: input.id,
      enabled: input.enabled,
    });
    const payload = result.data?.toggleWorkflow;
    if (!result.success || payload?.error || !payload?.workflow) {
      return {
        success: false,
        error: workflowPayloadError(payload, result.error),
        summary: `Failed to set workflow ${input.id} enabled=${input.enabled}`,
      };
    }
    return {
      success: true,
      workflow: payload.workflow,
      summary: `Workflow ${payload.workflow.id} is now ${payload.workflow.enabled ? "enabled" : "disabled"}`,
    };
  }

  return {
    success: false,
    error: `Unsupported direct workflow tool: ${name}`,
    summary: "Unsupported direct workflow tool",
  };
}

// Start OAuth authentication flow
async function startAuthenticationFlow(): Promise<any> {
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

  const headers: any = {
    "Content-Type": "application/json",
  };

  const response = await axios.post(
    `${CAIDO_CONFIG.baseUrl}/graphql`,
    graphqlQuery,
    { headers },
  );

  if (response.data.errors) {
    logToFile(
      `GraphQL errors: ${JSON.stringify(response.data.errors)}`,
      "ERROR",
    );
    throw new Error(
      `Failed to start auth flow: ${response.data.errors.map((e: any) => e.message).join("; ")}`,
    );
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
function startTokenSubscription(requestId: string) {
  const wsUrl = CAIDO_CONFIG.baseUrl.replace(/^http/, "ws") + "/ws/graphql";
  logToFile(
    `Starting background subscription at: ${wsUrl} for requestId: ${requestId}`,
  );

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

    client.subscribe(
      {
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
      },
      {
        next: (data: any) => {
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
        error: (err: any) => {
          logToFile(
            `Background subscription error: ${JSON.stringify(err)}`,
            "ERROR",
          );
          client.dispose();
        },
        complete: () => {
          logToFile("Background subscription completed");
          client.dispose();
        },
      },
    );
  } catch (error) {
    logToFile(`Failed to create background subscription: ${error}`, "ERROR");
  }
}

// Check if token has been received
function checkAuthenticationState(): any {
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
- **Workflows** - Reusable Caido automation graphs. There are three important kinds:
  - ACTIVE workflows run against a selected request ID with run_active_workflow.
  - PASSIVE workflows analyze traffic and are usually enabled/disabled with toggle_workflow.
  - CONVERT workflows transform bytes/text. They are the workflow kind to use as building blocks in other modules.
    Use CONVERT workflow IDs in Tamper replacers via replacer.workflow.id, and in HTTP Replay placeholders via placeholders[].preprocessors[].options.workflow.id.
    Do not invent workflow definition JSON from memory. Before create_workflow/update_workflow, use get_workflow_definition_guide, generate_workflow_template, or clone an existing definition from get_workflow/list_workflows(include_definition: true), then validate with the matching test_*_workflow tool.
    When the user wants Match/Replace to transform a matched value dynamically, list_workflows(kind: "CONVERT") first, then create_tamper_rule/update_tamper_rule with a workflow replacer.
    When the user wants Replay placeholders to transform selected request bytes before sending, use update_http_replay_draft with a workflow preprocessor, then start_replay_task.
    When the user asks to save a session, captcha, CSRF, JWT, cookie, header, or query parameter into an environment variable and reuse it in requests, generate an AUTH_CAPTURE workflow template with custom extraction_code, test it, create and enable it, then use update_http_replay_draft with an environment preprocessor placeholder pointing at that variable name.
    For AUTH_CAPTURE extraction_code, use get_workflow_definition_guide for Caido JavaScript context. request/response expose getBody()?.toText(), request.getQuery(), and getHeader(name). In current Caido builds getHeader(name) returns an array, so use header[0] or join the array before parsing cookies.
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
const server = new Server(
  {
    name: "caido-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
    instructions: SERVER_INSTRUCTIONS,
  },
);

// Register tools from tools.ts
server.setRequestHandler(ListToolsRequestSchema, () => {
  logToFile("Listing available tools");
  const tools: Tool[] = tools_description.map((tool: any) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: "object" as const,
      properties: tool.input_schema.properties,
      required: tool.input_schema.required,
    },
  }));

  // Add authentication tools
  const authenticateTool: Tool = {
    name: "authenticate",
    description:
      "Start OAuth authentication flow with Caido. This will provide a verification URL for the user to authorize the connection.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  };

  const checkAuthTool: Tool = {
    name: "check_authentication",
    description:
      "Check the status of pending authentication request. Use this after the user has completed the verification.",
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
  logToFile(
    `Tool call requested: ${name} with arguments: ${JSON.stringify(args)}`,
  );

  try {
    // Auto-refresh token before tool calls (except auth tools)
    if (name !== "authenticate" && name !== "check_authentication") {
      await ensureValidToken();
    }

    let result: any;

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
      } else {
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
      const params = (args as any) || "";
      logToFile(`Args: ${JSON.stringify(args)}`);
      logToFile(`Params: ${JSON.stringify(params)}`);

      // @ts-ignore
      const pat = params.pat || "";
      // @ts-ignore
      const apiEndpoint = params.api_endpoint || "";

      logToFile(`Configuring connection with endpoint: ${apiEndpoint}`);
      // Update configuration - use provided PAT or keep existing
      if (pat) {
        CAIDO_CONFIG.authToken = pat as string;
      }
      // @ts-ignore
      CAIDO_CONFIG.baseUrl = apiEndpoint.replace(/\/graphql$/, "") as string;

      // Test connection by getting plugin info
      const pluginId = await findCaidoPlugin();

      result = {
        success: true,
        message: "PAT and API endpoint configured successfully",
        pluginId: pluginId,
        pluginName: "Ebka AI Assistant",
      };

      logToFile(`Connection configured successfully. Plugin ID: ${pluginId}`);
    } else if (name === "get_plugin_info") {
      // Get plugin information
      result = await getPluginInfo();
    } else if (directWorkflowTools.has(name)) {
      result = await executeDirectWorkflowTool(name, args as any);
    } else {
      // Call regular function in Caido plugin
      // In MCP calls, args already contains the parameters object
      const params = JSON.stringify(args as any) || {};
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
  } catch (error: any) {
    logToFile(`Error executing tool ${name}: ${error}`, "ERROR");

    // Check if this is an authentication error
    const errorMessage = error?.message || String(error);
    const isAuthError =
      errorMessage.includes("401") ||
      errorMessage.includes("Unauthorized") ||
      errorMessage.includes("authentication") ||
      errorMessage.includes("No plugin packages found");

    if (
      isAuthError &&
      !CAIDO_CONFIG.authToken &&
      name !== "authenticate" &&
      name !== "check_authentication"
    ) {
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
        } catch (error) {
          logToFile(`Token refresh on startup failed: ${error}`, "ERROR");
        }
      } else {
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
