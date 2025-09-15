import { Blob, fetch, Headers, Request, Response } from "caido:http";
import type { DefineAPI, SDK } from "caido:plugin";

// Import functions from modules
import { sendMessage } from "./chat";
import {
  getProgramResult,
  initializeDatabase,
  sendAuthToken,
  setClaudeApiKey,
} from "./database";
import { handlers } from "./handlers";
import { getAvailableModels } from "./models";
import {
  createSession,
  deleteSession,
  getSessionMessages,
  getSessions,
  renameSession,
} from "./sessions";
import { getToolExecutionState } from "./tool-tracking";

// @ts-ignore
globalThis.fetch = fetch;
// @ts-ignore
globalThis.Headers = Headers;
// @ts-ignore
globalThis.Request = Request;
// @ts-ignore
globalThis.Response = Response;
// @ts-ignore
globalThis.Blob = Blob;

// AI API requires FormData, but doesn't use it
// @ts-ignore
globalThis.FormData = class trash {
  constructor(...args: any) {
    return {};
  }
};

export type API = DefineAPI<{
  setClaudeApiKey: (
    apiKey: string,
  ) => Promise<{ success: boolean; message?: string }>;
  getClaudeApiKey: () => Promise<string | null>;
  sendMessage: (
    message: string,
    selectedModel?: string,
    sessionId?: number,
  ) => Promise<string>;
  getAvailableModels: () => Promise<{ id: string; name: string }[]>;
  createSession: (
    name: string,
  ) => Promise<{ success: boolean; sessionId?: number; message?: string }>;
  getSessions: () => Promise<
    { id: number; name: string; created_at: string; updated_at: string }[]
  >;
  getSessionMessages: (
    sessionId: number,
  ) => Promise<{ role: string; content: string; timestamp: string }[]>;
  renameSession: (
    sessionId: number,
    newName: string,
  ) => Promise<{ success: boolean; message?: string }>;
  deleteSession: (
    sessionId: number,
  ) => Promise<{ success: boolean; message?: string }>;
  getConversationHistory: (
    sessionId: number,
  ) => Promise<{ role: string; content: string; timestamp: string }[]>;
  getProgramResult: (resultId: number) => Promise<any>;
  getToolExecutionState: (sessionId: number) => any;
  sendAuthToken: (
    accessToken: string,
    apiEndpoint?: string,
  ) => Promise<{ success: boolean; message?: string }>;
  claudeDesktop: (toolName: string, args: string) => any;
}>;

export type Events = {
  "request-auth-token": { source: string; timestamp: number; message: string };
  "auth-token-saved": { success: boolean; timestamp: number; message: string };
};

export function init(sdk: SDK<API, Events>) {
  // Initialize database when plugin starts
  initializeDatabase(sdk);

  // Trigger request-auth-token event to get auth token from frontend
  setTimeout(() => {
    try {
      sdk.console.log("🔐 Triggering request-auth-token event...");
      sdk.api.send("request-auth-token", {
        source: "backend",
        timestamp: Date.now(),
        message: "Requesting auth token from frontend",
      });
    } catch (error) {
      sdk.console.error("❌ Error triggering request-auth-token event:", error);
    }
  }, 1000); // Delay 1 second to ensure frontend is ready

  sdk.api.register("setClaudeApiKey", setClaudeApiKey);
  sdk.api.register("sendMessage", sendMessage);
  sdk.api.register("getAvailableModels", getAvailableModels);
  sdk.api.register("createSession", createSession);
  sdk.api.register("getSessions", getSessions);
  sdk.api.register("getSessionMessages", getSessionMessages);
  sdk.api.register("renameSession", renameSession);
  sdk.api.register("deleteSession", deleteSession);
  sdk.api.register("getProgramResult", getProgramResult);
  sdk.api.register("getToolExecutionState", (sdk: any, sessionId: number) =>
    getToolExecutionState(sessionId),
  );
  sdk.api.register(
    "sendAuthToken",
    (sdk: any, accessToken: string, apiEndpoint?: string) =>
      sendAuthToken(sdk, accessToken, apiEndpoint),
  );
  sdk.api.register("claudeDesktop", desktopIntegration);
}

async function desktopIntegration(
  sdk: SDK<API, Events>,
  toolName: string,
  input: string,
) {
  if (!Object.hasOwn(handlers, toolName.replace("caido_", ""))) {
    return `Handler for tool ${toolName} not found`;
  }
  return await handlers[
    toolName.replace("caido_", "") as keyof typeof handlers
  ](sdk, JSON.parse(input));
}
