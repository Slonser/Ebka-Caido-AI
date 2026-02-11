import type { SDK } from "caido:plugin";

import {
  getClaudeApiKey,
  getDefaultSessionId,
  saveProgramResult,
} from "./database";
import { handlers } from "./handlers";
import { createAnthropicClient } from "./models";
import { getConversationHistory, saveMessage } from "./sessions";
import {
  saveToolExecutionState,
  startToolExecution,
  stopToolExecution,
} from "./tool-tracking";
import { tools_description } from "./tools";

/**
 * Recursively process Claude responses that may contain tool_use
 * This function handles chains of tool executions
 */
const processClaudeResponse = async (
  sdk: SDK,
  anthropic: any,
  modelToUse: string,
  messages: any[],
  systemPrompt: string,
  currentSessionId: number,
  maxRecursionDepth: number = 5,
): Promise<{
  finalResponse: string;
  toolResults: Array<{ name: string; resultId: number; summary: string }>;
}> => {
  if (maxRecursionDepth <= 0) {
    throw new Error(
      "Maximum recursion depth exceeded for tool execution chain",
    );
  }

  const response = await anthropic.messages.create({
    model: modelToUse,
    max_tokens: 5000,
    messages: messages,
    stream: false,
    tools: tools_description as any,
    system: systemPrompt,
  });

  let finalResponse = "";
  let hasToolUse = false;
  const toolResults: Array<{
    name: string;
    resultId: number;
    summary: string;
  }> = [];

  for (const contentItem of response.content) {
    if (contentItem.type === "text") {
      const textContent = contentItem as { type: "text"; text: string };
      finalResponse += textContent.text;
      sdk.console.log(
        `Claude text response received: ${textContent.text.substring(0, 50)}...`,
      );
    } else if (contentItem.type === "tool_use") {
      hasToolUse = true;
      const toolUse = contentItem;
      sdk.console.log(
        `Claude tool use (recursion level ${6 - maxRecursionDepth}): ${toolUse.name} with input: ${JSON.stringify(toolUse.input)}`,
      );

      // Start tool execution tracking
      sdk.console.log(
        `Starting tool execution tracking for session ${currentSessionId}`,
      );
      startToolExecution(currentSessionId, toolUse.name, toolUse.input);

      try {
        await saveMessage(
          sdk,
          currentSessionId,
          "assistant",
          `Using tool: ${toolUse.name}`,
        );
        // @ts-ignore
        const handler = handlers[toolUse.name.replace("caido_", "")];
        if (!handler) {
          throw new Error("Handler not found for tool: " + toolUse.name);
        }

        // Execute the tool
        sdk.console.log(`Executing tool ${toolUse.name}...`);
        // @ts-ignore
        const toolResult = await handler(sdk, toolUse.input);

        // Save the result to program_results table
        const resultId = await saveProgramResult(
          sdk,
          currentSessionId,
          toolUse.name,
          toolUse.input,
          toolResult,
          toolResult.summary,
        );

        // Add tool result to tracking
        toolResults.push({
          name: toolUse.name,
          resultId: resultId,
          summary: toolResult.summary,
        });

        // Send tool result back to Claude for continuation
        const toolResultMessage = {
          role: "user" as const,
          content: `Tool ${toolUse.name} executed successfully. Results saved to id: ${resultId}. ${toolResult.summary}`,
        };

        // Add tool result to conversation history
        messages.push(toolResultMessage);
        await saveMessage(
          sdk,
          currentSessionId,
          "assistant",
          toolResultMessage.content,
        );

        // Recursively process the next response
        const nextSystemPrompt = `${systemPrompt}\n\nThe user has executed tools: ${toolResults.map((t) => t.name).join(", ")}. Please provide a helpful response based on all tool execution results.`;

        const recursiveResult = await processClaudeResponse(
          sdk,
          anthropic,
          modelToUse,
          messages,
          nextSystemPrompt,
          currentSessionId,
          maxRecursionDepth - 1,
        );

        // Merge results
        finalResponse = recursiveResult.finalResponse;
        toolResults.push(...recursiveResult.toolResults);

        // Stop tool execution tracking
        stopToolExecution(currentSessionId);
      } catch (error) {
        // Stop tool execution tracking on error
        await new Promise((resolve) => setTimeout(resolve, 5000));
        saveToolExecutionState(currentSessionId, toolUse.name, toolUse.input);
        throw error;
      }
    }
  }

  // If no tool use, return the text response
  if (!hasToolUse && finalResponse) {
    return { finalResponse, toolResults };
  } else if (!hasToolUse) {
    // Fall back to tool results summary if no tool use and no text
    if (toolResults.length > 0) {
      const summaryMessage = `Tools executed: ${toolResults.map((t) => t.name).join(", ")}. Results saved to ids: ${toolResults.map((t) => t.resultId).join(", ")}.`;
      return { finalResponse: summaryMessage, toolResults };
    }
    return { finalResponse: "No response generated", toolResults };
  }

  return { finalResponse, toolResults };
};

export const sendMessage = async (
  sdk: SDK,
  message: string,
  selectedModel?: string,
  sessionId?: number,
) => {
  try {
    const claudeApiKey = await getClaudeApiKey(sdk);

    if (!claudeApiKey) {
      return "Please set your Claude API Key first. Use the input field above to add your API key.";
    }

    // Initialize Anthropic client
    const anthropic = await createAnthropicClient(sdk);

    // Use selected model or default to claude-3-haiku-20240307
    const modelToUse = selectedModel || "claude-3-haiku-20240307";

    // Get session ID (use provided or default to first session)
    let currentSessionId: number;
    if (sessionId) {
      currentSessionId = sessionId;
    } else {
      currentSessionId = await getDefaultSessionId(sdk);
    }

    // Get conversation history for this session
    const history = await getConversationHistory(sdk, currentSessionId);

    // Prepare messages array for Claude API
    const messages = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Add current user message
    messages.push({
      role: "user",
      content: message,
    });

    // Save user message to database
    await saveMessage(sdk, currentSessionId, "user", message);

    // Use the recursive function to process Claude's response
    const systemPrompt = `Your AI assistant running in Caido. You are able to use provided tools to help user doing bugbounty`;
    const result = await processClaudeResponse(
      sdk,
      anthropic,
      modelToUse,
      messages,
      systemPrompt,
      currentSessionId,
    );

    const finalResponse = result.finalResponse;
    const hasToolUse = result.toolResults.length > 0;

    // If we have a text response, save and return it
    if (finalResponse) {
      if (!hasToolUse) {
        // Only save text response if no tools were used (to avoid duplicate saves)
        await saveMessage(sdk, currentSessionId, "assistant", finalResponse);
      }
      return finalResponse;
    } else {
      const errorMessage =
        "Sorry, I received an unexpected response format from Claude.";
      sdk.console.error("Unexpected response format:", result);
      return errorMessage;
    }
  } catch (error) {
    sdk.console.error("Error in sendMessage:" + error);

    // Check if it's an API key error
    if (error instanceof Error && error.message.includes("401")) {
      return "Error: Invalid API key. Please check your Claude API key and try again.";
    } else if (error instanceof Error && error.message.includes("429")) {
      return "Error: Rate limit exceeded. Please wait a moment and try again.";
    } else if (error instanceof Error && error.message.includes("500")) {
      return "Error: Claude service is temporarily unavailable. Please try again later.";
    } else {
      return `Error: Unable to communicate with Claude. ${error instanceof Error ? error.message : "Unknown error"}`;
    }
  }
};
