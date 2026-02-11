<script setup lang="ts">
import Dropdown from "primevue/dropdown";
import { nextTick, onMounted, ref } from "vue";

import { useSDK } from "@/plugins/sdk";

// Retrieve the SDK instance to interact with the backend
const sdk = useSDK();

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tools?: Array<{
    toolName: string;
    toolInput: any;
    toolResult?: any;
    isExecuted: boolean;
  }>;
  // Legacy fields for backward compatibility
  toolName?: string;
  toolInput?: any;
  toolResult?: any;
  isToolExecution?: boolean;
}

interface ClaudeModel {
  id: string;
  name: string;
  description: string;
}

interface ChatSession {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

const messages = ref<ChatMessage[]>([]);
const newMessage = ref("");
const isLoading = ref(false);
const messageId = ref(0);
const apiKey = ref("");
const isSettingApiKey = ref(false);
const currentApiKey = ref<string | null>(null);
const availableModels = ref<ClaudeModel[]>([]);
const selectedModel = ref<ClaudeModel | null>(null);
const isLoadingModels = ref(false);

// Tool execution state
const isToolExecuting = ref(false);
const executingToolName = ref<string>("");
const executingToolInput = ref<string>("");

// Session management
const sessions = ref<ChatSession[]>([]);
const currentSession = ref<ChatSession | null>(null);
const isLoadingSessions = ref(false);
const newSessionName = ref("");
const isCreatingSession = ref(false);
const editingSession = ref<ChatSession | null>(null);
const editingSessionName = ref("");

// Get current API key on component mount
const getCurrentApiKey = async () => {
  try {
    // Check if API key is set by trying to get available models
    const modelsResponse = await sdk.backend.getAvailableModels();
    // @ts-ignore
    if (modelsResponse.success) {
      // If we can get models, API key is working
      currentApiKey.value = "Configured ✓";
      // Load available models and sessions
      await Promise.all([loadAvailableModels(), loadSessions()]);
    }
  } catch (error) {
    console.error("Error in getCurrentApiKey:", error);
  }
};

const loadAvailableModels = async () => {
  if (!currentApiKey.value) return;

  isLoadingModels.value = true;
  try {
    const response = await sdk.backend.getAvailableModels();
    // @ts-ignore
    if (response.success) {
      // @ts-ignore
      availableModels.value = response.models;
      // Set default model to first available
      // @ts-ignore
      if (response.models.length > 0 && !selectedModel.value) {
        // @ts-ignore
        selectedModel.value = response.models[0];
      }
    } else {
      // @ts-ignore
      console.error("Failed to load models:", response.error);
    }
  } catch (error) {
    console.error("Error loading models:", error);
  } finally {
    isLoadingModels.value = false;
  }
};

const loadSessions = async () => {
  if (!currentApiKey.value) {
    return;
  }

  isLoadingSessions.value = true;
  try {
    const response = await sdk.backend.getSessions();
    // @ts-ignore
    if (response.success) {
      // @ts-ignore
      sessions.value = response.sessions;
      // Set current session to first available or create new one
      // @ts-ignore
      if (response.sessions.length > 0 && !currentSession.value) {
        // @ts-ignore
        currentSession.value = response.sessions[0];
        // @ts-ignore
        await loadSessionMessages(response.sessions[0].id);
      }
    } else {
      // @ts-ignore
      console.error("Failed to load sessions:", response.error);
    }
  } catch (error) {
    console.error("Error loading sessions:", error);
  } finally {
    isLoadingSessions.value = false;
  }
};

const loadSessionMessages = async (sessionId: number) => {
  try {
    // Clear any existing tool execution state when switching sessions
    isToolExecuting.value = false;
    executingToolName.value = "";
    executingToolInput.value = "";
    // @ts-ignore
    const response = await sdk.backend.getSessionMessages(sessionId);
    if (response.success) {
      // Convert database messages to UI format and detect tool execution messages
      messages.value = response.messages.map((msg: any) => {
        const message: ChatMessage = {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
        };

        // Detect tool execution messages by content patterns
        if (msg.role === "assistant") {
          // Check for tool execution messages
          if (
            msg.content.includes("Using tool:") ||
            msg.content.includes("Tool executed successfully") ||
            msg.content.includes("Results saved to id:") ||
            (msg.content.includes("Tool") &&
              msg.content.includes("executed successfully")) ||
            (msg.content.includes("Tool") && msg.content.includes("completed"))
          ) {
            // Initialize tools array if not exists
            if (!message.tools) {
              message.tools = [];
            }

            // Extract tool name from content
            let toolName = "";
            let toolResult = "";

            // Try different patterns to extract tool name
            const toolMatch1 = msg.content.match(/tool:?\s*([^\s,]+)/i);
            const toolMatch2 = msg.content.match(
              /Tool\s+"([^"]+)"\s+executed successfully/i,
            );
            const toolMatch3 = msg.content.match(
              /Tool\s+"([^"]+)"\s+completed/i,
            );
            const toolMatch4 = msg.content.match(
              /Tool\s+([^\s]+)\s+executed successfully/i,
            );

            if (toolMatch1) toolName = toolMatch1[1];
            else if (toolMatch2) toolName = toolMatch2[1];
            else if (toolMatch3) toolName = toolMatch3[1];
            else if (toolMatch4) toolName = toolMatch4[1];

            if (toolName) {
              // Check if tool already exists in tools array
              const existingToolIndex = message.tools.findIndex(
                (t) => t.toolName === toolName,
              );

              if (existingToolIndex === -1) {
                // Add new tool to tools array
                message.tools.push({
                  toolName: toolName,
                  toolInput: {},
                  toolResult: undefined,
                  isExecuted: true,
                });
              }

              // Legacy support - keep old fields for backward compatibility
              message.toolName = toolName;
              message.isToolExecution = true;

              // Try to extract tool input from content if available
              if (msg.content.includes("Input parameters:")) {
                try {
                  const inputMatch = msg.content.match(
                    /Input parameters:\s*(\{.*\})/s,
                  );
                  if (inputMatch) {
                    const toolInput = JSON.parse(inputMatch[1]);
                    message.toolInput = toolInput;
                    // Update tools array
                    const toolIndex = message.tools.findIndex(
                      (t) => t.toolName === toolName,
                    );
                    if (toolIndex !== -1) {
                      // @ts-ignore
                      message.tools[toolIndex].toolInput = toolInput;
                    }
                  } else {
                    message.toolInput = {};
                  }
                } catch (e) {
                  message.toolInput = {};
                }
              } else {
                message.toolInput = {}; // We don't have this info from history
              }

              // Extract the actual result content, removing technical details
              if (msg.content.includes("Results saved to id:")) {
                // Extract the summary part after "Results saved to id: X. "
                const summaryMatch = msg.content.match(
                  /Results saved to id:\s*\d+\.\s*(.+)/i,
                );
                if (summaryMatch) {
                  toolResult = summaryMatch[1];
                } else {
                  toolResult = msg.content;
                }
              } else if (
                msg.content.includes("Tool") &&
                msg.content.includes("executed successfully")
              ) {
                // Extract the summary part after "executed successfully. "
                const summaryMatch = msg.content.match(
                  /executed successfully\.\s*(.+)/i,
                );
                if (summaryMatch) {
                  toolResult = summaryMatch[1];
                } else {
                  toolResult = "Tool execution completed";
                }
              } else {
                toolResult = msg.content;
              }

              // Keep the original content but mark as tool execution
              message.toolResult = { summary: toolResult };

              // Update tools array with result
              const toolIndex = message.tools.findIndex(
                (t) => t.toolName === toolName,
              );
              if (toolIndex !== -1) {
                // @ts-ignore
                message.tools[toolIndex].toolResult = { summary: toolResult };
              }
            }
          }
        }

        return message;
      });
      messageId.value =
        Math.max(...response.messages.map((m: any) => m.id), 0) + 1;
    } else {
      console.error("Failed to load session messages:", response.error);
    }
  } catch (error) {
    console.error("Error loading session messages:", error);
  }
};

const createNewSession = async () => {
  if (!newSessionName.value.trim()) return;

  isCreatingSession.value = true;
  try {
    // @ts-ignore
    const result = await sdk.backend.createSession(newSessionName.value.trim());
    if (result.success) {
      newSessionName.value = "";
      await loadSessions();
      // Switch to new session
      const newSession = sessions.value.find((s) => s.id === result.sessionId);
      if (newSession) {
        currentSession.value = newSession;
        messages.value = [];
        messageId.value = 0;
        // Clear tool execution state for new session
        isToolExecuting.value = false;
        executingToolName.value = "";
        executingToolInput.value = "";
      }
    }
  } catch (error) {
    console.error("Error creating session:", error);
  } finally {
    isCreatingSession.value = false;
  }
};

const switchToSession = async (session: ChatSession) => {
  currentSession.value = session;
  await loadSessionMessages(session.id);
};

const startEditingSession = (session: ChatSession) => {
  editingSession.value = session;
  editingSessionName.value = session.name;
};

const saveSessionName = async () => {
  if (!editingSession.value || !editingSessionName.value.trim()) return;

  try {
    // @ts-ignore
    const result = await sdk.backend.renameSession(
      // @ts-ignore
      editingSession.value.id,
      editingSessionName.value.trim(),
    );
    if (result.success) {
      await loadSessions();
      // Update current session if it's the one being edited
      if (currentSession.value?.id === editingSession.value.id) {
        currentSession.value =
          sessions.value.find((s) => s.id === editingSession.value!.id) || null;
      }
    }
  } catch (error) {
    console.error("Error renaming session:", error);
  } finally {
    editingSession.value = null;
    editingSessionName.value = "";
  }
};

const deleteSession = async (session: ChatSession) => {
  if (
    !confirm(
      `Are you sure you want to delete "${session.name}"? This action cannot be undone.`,
    )
  ) {
    return;
  }

  try {
    // @ts-ignore
    const result = await sdk.backend.deleteSession(session.id);
    if (result.success) {
      await loadSessions();
      // If deleted session was current, switch to first available
      if (currentSession.value?.id === session.id) {
        if (sessions.value.length > 0) {
          // @ts-ignore
          currentSession.value = sessions.value[0];
          // @ts-ignore
          await loadSessionMessages(sessions.value[0].id);
        } else {
          currentSession.value = null;
          messages.value = [];
          messageId.value = 0;
        }
      }
    }
  } catch (error) {
    console.error("Error deleting session:", error);
  }
};

// Set Claude API Key
const setApiKey = async () => {
  if (!apiKey.value.trim()) return;

  isSettingApiKey.value = true;
  try {
    // @ts-ignore
    const result = await sdk.backend.setClaudeApiKey(apiKey.value.trim());
    if (result.success) {
      // Clear the input after successful setting
      apiKey.value = "";
      // Update current API key display
      currentApiKey.value = "Configured ✓";
      // Load available models and sessions
      await Promise.all([loadAvailableModels(), loadSessions()]);
      // Add a system message
      const systemMsg: ChatMessage = {
        id: messageId.value++,
        role: "assistant",
        content:
          "✅ Claude API Key configured successfully! You can now start chatting with Claude.",
        timestamp: new Date(),
      };
      messages.value.push(systemMsg);
    }
  } catch (error) {
    console.error("Error setting API key:", error);
    const errorMsg: ChatMessage = {
      id: messageId.value++,
      role: "assistant",
      content: "❌ Failed to set API key. Please try again.",
      timestamp: new Date(),
    };
    messages.value.push(errorMsg);
  } finally {
    isSettingApiKey.value = false;
  }
};

// Change API Key - called when user wants to change the key
const changeApiKey = () => {
  currentApiKey.value = null;
  selectedModel.value = null;
  availableModels.value = [];
  sessions.value = [];
  currentSession.value = null;
  messages.value = [];
  messageId.value = 0;
  // Clear tool execution state
  isToolExecuting.value = false;
  executingToolName.value = "";
  executingToolInput.value = "";
  // Don't clear apiKey.value here - let user type
};

// Handle keydown events in textarea
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
  // If Shift+Enter is pressed, do nothing (allow default behavior for new line)
};

// Send message to chatbot
const sendMessage = async () => {
  if (!newMessage.value.trim() || isLoading.value || !currentSession.value)
    return;

  const userMessage = newMessage.value.trim();
  const userMsg: ChatMessage = {
    id: messageId.value++,
    role: "user",
    content: userMessage,
    timestamp: new Date(),
  };

  messages.value.push(userMsg);
  newMessage.value = "";
  isLoading.value = true;

  // Show initial processing state
  isToolExecuting.value = true;
  executingToolName.value = "Processing message...";
  executingToolInput.value = "";

  // Add initial processing message
  const processingMsg: ChatMessage = {
    id: messageId.value++,
    role: "assistant",
    content: "🔄 Processing your request...",
    timestamp: new Date(),
  };
  messages.value.push(processingMsg);

  // Force Vue to update the DOM
  await nextTick();
  scrollToBottom();

  // Start polling for tool execution state
  const pollInterval = setInterval(async () => {
    if (!currentSession.value) return;

    try {
      // @ts-ignore
      const state = await sdk.backend.getToolExecutionState(
        // @ts-ignore
        currentSession.value.id,
      );

      if (state && state.isExecuting) {
        isToolExecuting.value = true;
        executingToolName.value = `Executing: ${state.toolName}`;
        executingToolInput.value = JSON.stringify(state.toolInput, null, 2);

        // Update the processing message to show tool execution
        if (processingMsg) {
          // Initialize tools array if not exists
          if (!processingMsg.tools) {
            processingMsg.tools = [];
          }

          // Check if tool already exists
          const existingToolIndex = processingMsg.tools.findIndex(
            (t) => t.toolName === state.toolName,
          );

          if (existingToolIndex === -1) {
            // Add new tool to tools array
            processingMsg.tools.push({
              toolName: state.toolName,
              toolInput: state.toolInput,
              toolResult: undefined,
              isExecuted: false,
            });
          } else {
            // Update existing tool
            // @ts-ignore
            processingMsg.tools[existingToolIndex].toolInput = state.toolInput;
          }

          // Update content to show all tools
          const toolNames = processingMsg.tools
            .map((t) => t.toolName)
            .join(", ");
          processingMsg.content = `🔧 Using tools: ${toolNames}`;

          // Legacy support
          processingMsg.toolName = state.toolName;
          processingMsg.toolInput = state.toolInput;
          processingMsg.isToolExecution = true;
        }

        // Force Vue to update the DOM
        await nextTick();
        scrollToBottom();
      } else {
        if (isToolExecuting.value) {
          // Tool execution completed - update the processing message to show completion
          if (processingMsg && processingMsg.isToolExecution) {
            // Update the processing message to show completion
            processingMsg.content = "✅ Tool execution completed";

            // Mark all tools as executed
            if (processingMsg.tools) {
              processingMsg.tools.forEach((tool) => {
                tool.isExecuted = true;
              });
            }

            // Keep the tool information for display in the orange box
            // The message will be saved to history with tool information
          }
        }
        isToolExecuting.value = false;
        executingToolName.value = "";
        executingToolInput.value = "";

        // Force Vue to update the DOM
        await nextTick();
        scrollToBottom();
      }
    } catch (error) {
      console.error("Error checking tool execution state:", error);
    }
  }, 200); // Poll every 200ms

  try {
    // Call backend API with selected model and session
    const modelId = selectedModel.value?.id;
    // @ts-ignore
    const response = await sdk.backend.sendMessage(
      // @ts-ignore
      userMessage,
      modelId,
      currentSession.value.id,
    );

    // Handle the response
    if (processingMsg) {
      // If this was a tool execution, replace the tool message with the final response but keep tool info
      if (processingMsg.isToolExecution) {
        // Replace the content but keep tool information for the orange box
        processingMsg.content = response;
        processingMsg.timestamp = new Date();
        // The tool information (toolName, toolInput, isToolExecution) is preserved
      } else {
        // Regular message, just update content
        processingMsg.content = response;
        processingMsg.timestamp = new Date();
      }
    } else {
      // Fallback: create new message if processing message was lost
      const botMsg: ChatMessage = {
        id: messageId.value++,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      messages.value.push(botMsg);
    }

    // Scroll to bottom after new message
    await nextTick();
    scrollToBottom();

    // Reload sessions to update timestamps
    await loadSessions();
  } catch (error) {
    console.error("Error sending message:", error);

    // Replace the processing message with error message
    if (processingMsg) {
      processingMsg.content = "Sorry, something went wrong. Please try again.";
      processingMsg.timestamp = new Date();
    } else {
      // Fallback: create new error message if processing message was lost
      const errorMsg: ChatMessage = {
        id: messageId.value++,
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      };
      messages.value.push(errorMsg);
    }

    // Clear tool execution state on error
    isToolExecuting.value = false;
    executingToolName.value = "";
    executingToolInput.value = "";
  } finally {
    isLoading.value = false;
    // Stop polling
    clearInterval(pollInterval);
    // Final check to ensure tool execution state is cleared
    await checkToolExecutionState();

    // Ensure tool execution state is cleared
    if (isToolExecuting.value) {
      isToolExecuting.value = false;
      executingToolName.value = "";
      executingToolInput.value = "";
    }
  }
};

// Handle Enter key press in message input
// @ts-ignore
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

// Handle Enter key press in API key input
const handleApiKeyKeyPress = (event: KeyboardEvent) => {
  if (event.key === "Enter") {
    event.preventDefault();
    setApiKey();
  }
};

// Start tool execution indicato
// @ts-ignore
const startToolExecution = (toolName: string, toolInput: any) => {
  isToolExecuting.value = true;
  executingToolName.value = toolName;
  executingToolInput.value = JSON.stringify(toolInput, null, 2);
};

// Stop tool execution indicator
// @ts-ignore
const stopToolExecution = () => {
  isToolExecuting.value = false;
  executingToolName.value = "";
  executingToolInput.value = "";
};

// Check tool execution state from backend
const checkToolExecutionState = async () => {
  if (!currentSession.value) return;

  try {
    // @ts-ignore
    const state = await sdk.backend.getToolExecutionState(
      // @ts-ignore
      currentSession.value.id,
    );

    if (state) {
      isToolExecuting.value = state.isExecuting;
      executingToolName.value = state.toolName;
      executingToolInput.value = JSON.stringify(state.toolInput, null, 2);

      // Force Vue to update the DOM
      await nextTick();
    } else {
      isToolExecuting.value = false;
      executingToolName.value = "";
      executingToolInput.value = "";

      // Force Vue to update the DOM
      await nextTick();
    }
  } catch (error) {
    console.error("Error checking tool execution state:", error);
  }
};

// Scroll to bottom of chat
const scrollToBottom = () => {
  const chatContainer = document.getElementById("chat-container");
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
};

// @ts-ignore
// Format time for messages
const formatTime = (date: Date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Format session date
const formatSessionDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return "Today";
  } else if (diffDays === 2) {
    return "Yesterday";
  } else if (diffDays <= 7) {
    return `${diffDays - 1} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Get current API key on mount
onMounted(async () => {
  console.log("App.vue mounted - checking if component is working");
  await getCurrentApiKey();
  // Load sessions if API key is already configured
  if (currentApiKey.value) {
    await loadSessions();
  }
});
</script>

<template>
  <div class="app-container">
    <!-- API Key Section -->
    <div class="api-key-section">
      <div class="api-key-input">
        <label for="api-key">Anthropic API Key:</label>
        <div v-if="!currentApiKey">
          <input
            id="api-key"
            v-model="apiKey"
            type="password"
            placeholder="Enter your API key"
            @keydown.enter="handleApiKeyKeyPress"
          />
          <button :disabled="!apiKey.trim()" @click="setApiKey">
            Set API Key
          </button>
        </div>
        <div v-else class="current-key-display">
          <span class="key-status">{{ currentApiKey }}</span>
          <button type="button" class="change-key-btn" @click="changeApiKey">
            Change Key
          </button>
        </div>
      </div>

      <!-- Model Selector -->
      <div v-if="availableModels.length > 0" class="model-selector">
        <label for="model-dropdown">Model:</label>
        <Dropdown
          id="model-dropdown"
          v-model="selectedModel"
          :options="availableModels"
          option-label="name"
          placeholder="Select a model"
          class="model-dropdown"
        />
      </div>
    </div>

    <!-- Main Content Container -->
    <div class="main-content-container">
      <div v-if="!currentApiKey" class="api-key-required">
        <div class="api-key-required-content">
          <div class="api-key-required-icon">🔑</div>
          <h2>Install Claude MCP with instruction or provide API Key</h2>
          <div class="installation-options">
            <div class="option">
              <h3>
                Option 1: Install MCP server (local connection with
                Claude/Cursor)
              </h3>
              <p>
                Follow the installation guide to set up MCP server to integrate
                with Caido:
              </p>
              <a
                href="https://github.com/Slonser/Ebka-Caido-AI/blob/main/claude-mcp-server/README.md"
                target="_blank"
                rel="noopener noreferrer"
                class="installation-link"
              >
                📖 View Installation Instructions
              </a>
            </div>
            <div class="option-divider">OR</div>
            <div class="option">
              <h3>Option 2: Provide API Key</h3>
              <p>Set your Anthropic API key above to begin using the chat</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else>
        <!-- Main Chat Area -->
        <div class="main-chat-area">
          <!-- Chat Header -->
          <div class="chat-header">
            <h2>{{ currentSession ? currentSession.name : "Chat" }}</h2>
            <!-- Tool execution status in header -->
            <div v-if="isToolExecuting" class="header-status">
              🔄 {{ executingToolName }}
            </div>
          </div>

          <!-- Chat Messages -->
          <div id="chat-container" class="chat-messages">
            <div v-if="!currentSession" class="empty-state">
              <div class="empty-icon">📋</div>
              <p>Please select or create a chat session to start</p>
            </div>

            <div v-else-if="messages.length === 0" class="empty-state">
              <div class="empty-icon">💬</div>
              <p>Start a conversation by typing a chat session to start</p>
            </div>

            <div v-else>
              <div
                v-for="(msg, index) in messages"
                :key="index"
                :class="[
                  'message',
                  msg.role === 'user' ? 'user-message' : 'assistant-message',
                ]"
              >
                <div class="message-content">
                  <div class="message-role">
                    {{ msg.role === "user" ? "You" : "Claude" }}
                  </div>
                  <div class="message-text">{{ msg.content }}</div>

                  <!-- Multiple tools display -->
                  <div
                    v-if="msg.tools && msg.tools.length > 0"
                    class="tools-display"
                  >
                    <div
                      v-for="(tool, toolIndex) in msg.tools"
                      :key="toolIndex"
                      class="tool-result-display"
                    >
                      <div class="tool-result-header">
                        <span class="tool-icon">🔧</span>
                        <span class="tool-name">{{ tool.toolName }}</span>
                        <span
                          class="tool-status"
                          :class="{ executed: tool.isExecuted }"
                        >
                          {{ tool.isExecuted ? "✅" : "🔄" }}
                        </span>
                      </div>

                      <div
                        v-if="
                          tool.toolInput &&
                          Object.keys(tool.toolInput).length > 0
                        "
                        class="tool-input-section"
                      >
                        <details>
                          <summary>Input parameters</summary>
                          <pre class="tool-input-content">{{
                            JSON.stringify(tool.toolInput, null, 2)
                          }}</pre>
                        </details>
                      </div>

                      <div v-if="tool.toolResult" class="tool-result-section">
                        <details>
                          <summary>Results</summary>
                          <pre class="tool-result-content">{{
                            JSON.stringify(tool.toolResult, null, 2)
                          }}</pre>
                        </details>
                      </div>
                    </div>
                  </div>

                  <!-- Legacy tool display for backward compatibility -->
                  <div
                    v-else-if="msg.isToolExecution && msg.toolName"
                    class="tool-result-display"
                  >
                    <div class="tool-result-header">
                      <span class="tool-icon">🔧</span>
                      <span class="tool-name">{{ msg.toolName }}</span>
                    </div>

                    <div
                      v-if="
                        msg.toolInput && Object.keys(msg.toolInput).length > 0
                      "
                      class="tool-input-section"
                    >
                      <details>
                        <summary>Input parameters</summary>
                        <pre class="tool-input-content">{{
                          JSON.stringify(msg.toolInput, null, 2)
                        }}</pre>
                      </details>
                    </div>

                    <div v-if="msg.toolResult" class="tool-result-section">
                      <details>
                        <summary>Results</summary>
                        <pre class="tool-result-content">{{
                          JSON.stringify(msg.toolResult, null, 2)
                        }}</pre>
                      </details>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tool Execution Indicator - Moved outside chat-messages for better visibility -->
          <div
            v-if="isToolExecuting"
            class="tool-execution-indicator"
            style="margin: 10px 20px"
          >
            <div class="tool-execution-content">
              <div class="tool-spinner">
                <div class="spinner"></div>
              </div>
              <div class="tool-info">
                <div class="tool-name">{{ executingToolName }}</div>
                <div
                  v-if="executingToolInput && executingToolInput !== '{}'"
                  class="tool-input"
                >
                  <details>
                    <summary>Input parameters</summary>
                    <pre>{{ executingToolInput }}</pre>
                  </details>
                </div>
              </div>
            </div>
          </div>

          <!-- Message Input -->
          <div class="message-input-section">
            <div class="input-container">
              <textarea
                v-model="newMessage"
                placeholder="Type your message here..."
                :disabled="!currentSession"
                class="message-input"
                rows="3"
                @keydown="handleKeydown"
              ></textarea>
              <button
                :disabled="!newMessage.trim() || !currentSession"
                class="send-button"
                @click="sendMessage"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <!-- Sessions Sidebar - Always Visible -->
        <div class="sessions-sidebar">
          <div class="sessions-header">
            <h3>Chat Sessions</h3>
          </div>

          <!-- Create New Session -->
          <div class="create-session">
            <div class="input-container">
              <input
                v-model="newSessionName"
                placeholder="New session name"
                class="session-name-input"
                @keydown.enter="createNewSession"
              />
              <button
                :disabled="!newSessionName.trim() || isCreatingSession"
                class="create-session-btn"
                @click="createNewSession"
              >
                {{ isCreatingSession ? "Creating..." : "Create" }}
              </button>
            </div>
          </div>

          <!-- Sessions List -->
          <div class="sessions-list">
            <div v-if="isLoadingSessions" class="loading-sessions">
              <p>Loading sessions...</p>
            </div>

            <div v-else-if="sessions.length === 0" class="no-sessions">
              <p>No sessions yet</p>
            </div>

            <div v-else>
              <div
                v-for="session in sessions"
                :key="session.id"
                :class="[
                  'session-item',
                  {
                    active: currentSession && currentSession.id === session.id,
                  },
                ]"
                @click="switchToSession(session)"
              >
                <div class="session-info">
                  <div class="session-name">
                    <span
                      v-if="editingSession && editingSession.id === session.id"
                    >
                      <input
                        ref="editInput"
                        v-model="editingSessionName"
                        class="edit-session-input"
                        @keydown.enter="saveSessionName"
                        @keydown.esc="editingSession = null"
                        @blur="saveSessionName"
                      />
                    </span>
                    <span v-else>{{ session.name }}</span>
                  </div>
                  <div class="session-date">
                    {{ formatSessionDate(session.updated_at) }}
                  </div>
                </div>

                <div class="session-actions">
                  <button
                    v-if="editingSession && editingSession.id === session.id"
                    class="save-btn"
                    title="Save"
                    @click="saveSessionName"
                  >
                    ✓
                  </button>
                  <button
                    v-else
                    class="edit-btn"
                    title="Rename"
                    @click.stop="startEditingSession(session)"
                  >
                    ✏️
                  </button>
                  <button
                    class="delete-btn"
                    title="Delete"
                    @click.stop="deleteSession(session)"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Global styles to prevent page scroll */
:global(body),
:global(html) {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 90vh;
  max-height: 90vh;
  overflow: hidden;
  background: transparent;
}

/* API Key Section */
.api-key-section {
  background: transparent;
  padding: 15px 20px;
  border-bottom: 1px solid rgba(224, 224, 224, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  flex-shrink: 0;
}

.api-key-input {
  display: flex;
  align-items: center;
  gap: 10px;
}

.api-key-input label {
  font-weight: 600;
  white-space: nowrap;
}

.api-key-input input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 200px;
  color: black;
}

.api-key-input button {
  padding: 8px 16px;
  background: #a0213e;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 5px;
}

.api-key-input button:disabled {
  background: #a0213e;
  cursor: not-allowed;
}

.change-key-btn {
  background: #a0213e;
  margin-left: 5px;
}

.current-key-display {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Model Selector */
.model-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.model-selector label {
  font-weight: 600;
  white-space: nowrap;
}

.model-dropdown {
  min-width: 200px;
}

/* API Key Required Message */
.api-key-required {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 40px;
}

.api-key-required-content {
  text-align: center;
  max-width: 400px;
}

.api-key-required-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.api-key-required h2 {
  margin: 0 0 15px 0;
  font-size: 1.8rem;
}

.api-key-required p {
  margin: 0;
  font-size: 1.1rem;
  color: #666;
}

/* Installation Options */
.installation-options {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
}

.option {
  text-align: center;
  padding: 20px;
  border: 1px solid rgba(224, 224, 224, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  min-width: 300px;
}

.option h3 {
  margin: 0 0 10px 0;
  font-size: 1.2rem;
  color: #a0213e;
}

.option p {
  margin: 0 0 15px 0;
  font-size: 1rem;
  color: #666;
}

.option-divider {
  font-weight: 600;
  font-size: 1.1rem;
  color: #a0213e;
  padding: 10px;
  background: rgba(160, 33, 62, 0.1);
  border-radius: 20px;
  min-width: 60px;
  text-align: center;
}

.installation-link {
  display: inline-block;
  padding: 10px 20px;
  background: #a0213e;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
  transition: background-color 0.2s ease;
}

.installation-link:hover {
  background: #8a1c35;
  text-decoration: none;
}

/* Main Content Container */
.main-content-container {
  display: flex;
  flex: 1;
  padding: 20px;
  min-height: 0; /* Important for flexbox */
  overflow: hidden;
}

.main-content-container > div:first-child {
  /* When only api-key-required is shown */
  width: 100%;
}

.main-content-container > div:last-child {
  /* When chat area and sidebar are shown */
  display: flex;
  flex-direction: row;
  gap: 20px;
  width: 100%;
}

/* Main Chat Area */
.main-chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: transparent;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.chat-header {
  padding: 20px;
  border-bottom: 1px solid rgba(224, 224, 224, 0.3);
  background: transparent;
  border-radius: 8px 8px 0 0;
}

.chat-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.header-status {
  color: #ffc107;
  font-size: 14px;
  margin-top: 5px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Chat Messages */
.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.empty-state p {
  font-size: 1.1rem;
  margin: 0;
}

.message {
  margin-bottom: 20px;
  padding: 15px;
  border-radius: 8px;
  max-width: 80%;
}

.user-message {
  background: #daa049;
  color: white;
  margin-left: auto;
}

.assistant-message {
  background: rgba(248, 249, 250, 0.3);
  border: 1px solid rgba(224, 224, 224, 0.3);
}

.message-content {
  display: flex;
  flex-direction: column;
}

.message-role {
  font-weight: 600;
  margin-bottom: 5px;
  font-size: 0.9rem;
  opacity: 0.8;
}

.message-text {
  line-height: 1.5;
  white-space: pre-wrap;
}

/* Message Input */
.message-input-section {
  padding: 20px;
  border-top: 1px solid rgba(224, 224, 224, 0.3);
  background: transparent;
  border-radius: 0 0 8px 8px;
}

/* Tool Execution Indicator Styles */
.tool-execution-indicator {
  margin: 20px;
  padding: 20px;
  background: linear-gradient(
    135deg,
    rgba(255, 193, 7, 0.9),
    rgba(255, 193, 7, 0.7)
  );
  border: 3px solid #ffc107;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(255, 193, 7, 0.4);
  animation: pulse 2s ease-in-out infinite;
  z-index: 1000;
  position: relative;
  color: #000;
  font-weight: bold;
}

.tool-execution-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.tool-spinner {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 193, 7, 0.3);
  border-top: 3px solid #ffc107;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 4px 20px rgba(255, 193, 7, 0.2);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 6px 25px rgba(255, 193, 7, 0.3);
    transform: scale(1.02);
  }
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-name {
  font-weight: 700;
  color: black !important;
  margin-bottom: 8px;
  font-size: 16px;
  text-shadow: none;
  letter-spacing: 0.5px;
}

.tool-input {
  font-size: 14px;
}

.tool-input details {
  cursor: pointer;
}

.tool-input summary {
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.tool-input pre {
  background: rgba(0, 0, 0, 0.1);
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  color: #333;
  margin: 0;
}

.input-container {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
  color: black;
}

.message-input:focus {
  outline: none;
  border-color: #daa049;
}

.send-button {
  padding: 12px 24px;
  background: #a0213e;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.send-button:hover {
  background: #c49242;
}

.send-button:disabled {
  background: #a0213e;
  cursor: not-allowed;
}

/* Sessions Sidebar */
.sessions-sidebar {
  width: 300px;
  min-width: 300px;
  max-width: 300px;
  background: transparent;
  border-left: 1px solid rgba(224, 224, 224, 0.3);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sessions-header {
  padding: 20px;
  border-bottom: 1px solid rgba(224, 224, 224, 0.3);
  background: transparent;
}

.sessions-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.create-session {
  padding: 20px;
  border-bottom: 1px solid rgba(224, 224, 224, 0.3);
}

.create-session .input-container {
  display: flex;
  gap: 10px;
}

.session-name-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  color: black;
}

.create-session-btn {
  padding: 8px 16px;
  background: #a0213e;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.create-session-btn:disabled {
  background: #a0213e;
  cursor: not-allowed;
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.loading-sessions,
.no-sessions {
  padding: 20px;
  text-align: center;
  color: #666;
}

.session-item {
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-item:hover {
  background-color: rgba(248, 249, 250, 0.3);
}

.session-item.active {
  background-color: rgba(227, 242, 253, 0.3);
  border-left: 3px solid #daa049;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-weight: 600;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-date {
  font-size: 0.8rem;
  color: #666;
}

.session-actions {
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.2s;
}

.session-item:hover .session-actions {
  opacity: 1;
}

.edit-btn,
.delete-btn,
.save-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  background: transparent;
}

.edit-btn:hover {
  background: rgba(227, 242, 253, 0.3);
}

.delete-btn:hover {
  background: rgba(255, 235, 238, 0.3);
}

.save-btn {
  background: #a0213e;
  color: white;
}

.edit-session-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #a0213e;
  border-radius: 4px;
  font-size: 14px;
  background: transparent;
  color: black;
}

/* Multiple Tools Display Styles */
.tools-display {
  margin-top: 15px;
}

.tools-display .tool-result-display {
  margin-bottom: 15px;
}

.tools-display .tool-result-display:last-child {
  margin-bottom: 0;
}

/* Tool Result Display Styles */
.tool-result-display {
  margin-top: 15px;
  padding: 15px;
  background: linear-gradient(
    135deg,
    rgba(255, 193, 7, 0.9),
    rgba(255, 193, 7, 0.7)
  );
  border: 3px solid #ffc107;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(255, 193, 7, 0.3);
  color: #000;
  font-weight: bold;
}

.tool-result-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(255, 193, 7, 0.5);
}

.tool-icon {
  font-size: 20px;
}

.tool-name {
  font-size: 16px;
  font-weight: 700;
  color: #ffc107;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  letter-spacing: 0.5px;
}

.tool-status {
  margin-left: auto;
  font-size: 18px;
  padding: 4px 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.tool-status.executed {
  background: rgba(76, 175, 80, 0.8);
  color: white;
}

.tool-input-section,
.tool-result-section {
  margin-bottom: 15px;
}

.tool-input-section:last-child,
.tool-result-section:last-child {
  margin-bottom: 0;
}

.tool-input-section summary,
.tool-result-section summary {
  cursor: pointer;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 14px;
  padding: 5px 0;
}

.tool-input-section summary:hover,
.tool-result-section summary:hover {
  color: #333;
}

.tool-input-content,
.tool-result-content {
  background: rgba(0, 0, 0, 0.1);
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  color: #333;
  margin: 0;
  font-family: "Courier New", monospace;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .sessions-sidebar {
    width: 250px;
  }
}

@media (max-width: 768px) {
  .main-content-container {
    flex-direction: column;
  }

  .sessions-sidebar {
    width: 100%;
    border-left: none;
    border-top: 1px solid rgba(224, 224, 224, 0.3);
  }

  .api-key-section {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
}
</style>
