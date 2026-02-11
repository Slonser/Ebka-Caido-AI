export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ClaudeModel {
  id: string;
  name: string;
  description: string;
}

export interface ChatSession {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface FrontendSDK {
  backend: BackendSDK;
  replay: ReplaySDK;
  requests: RequestsSDK;
  navigation: NavigationSDK;
  sidebar: SidebarSDK;
  ui: UISDK;
  window: WindowSDK;
}

export interface BackendSDK {
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
  claudeDesktop: (toolName: string, args: any) => any;
}

export interface GraphQLSDK {
  execute: (query: string, variables?: any) => Promise<any>;
}

export interface ReplaySDK {
  addToSlot: (slot: string, content: any) => void;
  openTab: (options?: any) => any;
  closeTab: () => void;
  getActiveTab: () => any;
  getTabs: () => any[];
  setActiveTab: (tab: any) => void;
  setTabTitle: (tab: any, title: string) => void;
  setTabContent: (tab: any, content: HTMLElement) => void;
  setTabToolbar: (tab: any, toolbar: HTMLElement) => void;
  setTabSidebar: (tab: any, sidebar: HTMLElement) => void;
  setTabStatus: (tab: any, status: string) => void;
  setTabProgress: (tab: any, progress: number) => void;
  setTabError: (tab: any, error: string) => void;
  setTabWarning: (tab: any, warning: string) => void;
  setTabInfo: (tab: any, info: string) => void;
  setTabSuccess: (tab: any, success: string) => void;
  setTabLoading: (tab: any, loading: boolean) => void;
  setTabDisabled: (tab: any, disabled: boolean) => void;
  setTabHidden: (tab: any, hidden: boolean) => void;
  setTabClosable: (tab: any, closable: boolean) => void;
  setTabMovable: (tab: any, movable: boolean) => void;
  setTabResizable: (tab: any, resizable: boolean) => void;
  setTabMaximizable: (tab: any, maximizable: boolean) => void;
  setTabMinimizable: (tab: any, minimizable: boolean) => void;
  setTabRestorable: (tab: any, restorable: boolean) => void;
  setTabFullscreen: (tab: any, fullscreen: boolean) => void;
  setTabPinned: (tab: any, pinned: boolean) => void;
  setTabGroup: (tab: any, group: string) => void;
  setTabOrder: (tab: any, order: number) => void;
  setTabPosition: (tab: any, position: { x: number; y: number }) => void;
  setTabSize: (tab: any, size: { width: number; height: number }) => void;
  setTabBounds: (
    tab: any,
    bounds: { x: number; y: number; width: number; height: number },
  ) => void;
  setTabZIndex: (tab: any, zIndex: number) => void;
  setTabOpacity: (tab: any, opacity: number) => void;
  setTabVisible: (tab: any, visible: boolean) => void;
  setTabFocusable: (tab: any, focusable: boolean) => void;
  setTabSelectable: (tab: any, selectable: boolean) => void;
  setTabEditable: (tab: any, editable: boolean) => void;
  setTabReadOnly: (tab: any, readOnly: boolean) => void;
  setTabRequired: (tab: any, required: boolean) => void;
  setTabValid: (tab: any, valid: boolean) => void;
  setTabInvalid: (tab: any, invalid: boolean) => void;
  setTabDirty: (tab: any, dirty: boolean) => void;
  setTabPristine: (tab: any, pristine: boolean) => void;
  setTabTouched: (tab: any, touched: boolean) => void;
  setTabUntouched: (tab: any, untouched: boolean) => void;
}

export interface RequestsSDK {
  query: () => any;
  get: (id: string) => Promise<any>;
  create: (request: any) => Promise<any>;
  update: (id: string, request: any) => Promise<any>;
  delete: (id: string) => Promise<boolean>;
}

export interface NavigationSDK {
  addPage: (path: string, options: any) => void;
  goTo: (path: string) => void;
}

export interface SidebarSDK {
  registerItem: (name: string, path: string, options?: any) => any;
}

export interface UISDK {
  button: (options?: any) => HTMLElement;
  card: (options?: any) => HTMLElement;
  well: (options?: any) => HTMLElement;
  showDialog: (component: any, options?: any) => any;
  showToast: (message: string, options?: any) => void;
}

export interface WindowSDK {
  getActiveEditor: () => any;
}

export interface FrontendTool {
  name: string;
  description: string;
  inputSchema: any;
  execute: (sdk: FrontendSDK, input: any) => Promise<any>;
}

export interface FrontendToolResult {
  success: boolean;
  data?: any;
  error?: string;
  summary: string;
}
