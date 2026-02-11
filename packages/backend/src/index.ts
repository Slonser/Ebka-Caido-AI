import { Blob, fetch, Headers, Request, Response } from "caido:http";
import type { DefineAPI, SDK } from "caido:plugin";

// Import functions from modules
import { sendMessage } from "./chat";
import {
  checkAuthenticationState,
  getCaidoPAT,
  getProgramResult,
  initializeDatabase,
  saveAuthenticationToken,
  setCaidoPAT,
  setClaudeApiKey,
  startAuthenticationFlow,
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
  setCaidoPAT: (
    pat: string,
    apiEndpoint?: string,
  ) => Promise<{ success: boolean; message?: string }>;
  getCaidoPAT: () => Promise<string | null>;
  startAuthenticationFlow: () => Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }>;
  checkAuthenticationState: (requestId: string) => Promise<{
    success: boolean;
    ready?: boolean;
    state?: string;
    data?: any;
    error?: string;
  }>;
  saveAuthenticationToken: (
    accessToken: string,
    refreshToken?: string,
    expiresAt?: string,
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  claudeDesktop: (toolName: string, args: string) => any;
}>;

export type Events = {};

export function init(sdk: SDK<API, Events>) {
  // Initialize database when plugin starts
  initializeDatabase(sdk);

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
    "setCaidoPAT",
    (sdk: any, pat: string, apiEndpoint?: string) =>
      setCaidoPAT(sdk, pat, apiEndpoint),
  );
  sdk.api.register("getCaidoPAT", getCaidoPAT);
  sdk.api.register("startAuthenticationFlow", startAuthenticationFlow);
  sdk.api.register("checkAuthenticationState", (sdk: any, requestId: string) =>
    checkAuthenticationState(sdk, requestId),
  );
  sdk.api.register(
    "saveAuthenticationToken",
    (
      sdk: any,
      accessToken: string,
      refreshToken?: string,
      expiresAt?: string,
    ) => saveAuthenticationToken(sdk, accessToken, refreshToken, expiresAt),
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
