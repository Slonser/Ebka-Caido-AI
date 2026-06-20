import type { SDK } from "caido:plugin";

import { executeGraphQLQueryviaSDK } from "../graphql";
import {
  WEBSOCKET_MESSAGE_COUNT_QUERY,
  WEBSOCKET_MESSAGE_QUERY,
  WEBSOCKET_MESSAGES_QUERY,
  WEBSOCKET_STREAM_QUERY,
  WEBSOCKET_STREAMS_QUERY,
} from "../graphql/queries";

const decodeBase64Payload = (raw: string | null | undefined) => {
  if (!raw) {
    return null;
  }
  try {
    return Buffer.from(raw, "base64").toString("utf8");
  } catch (_error) {
    return null;
  }
};

export const list_websocket_streams = async (sdk: SDK, input: any) => {
  try {
    const limit = input.limit || 50;
    const offset = input.offset || 0;
    const scopeId = input.scope_id;
    const order = input.order || { by: "ID", ordering: "DESC" };
    const filterCode = input.filter_code;
    const websocketFilter = 'stream.protocol.eq:"ws"';
    const streamFilter = filterCode
      ? `(${websocketFilter} AND (${filterCode}))`
      : websocketFilter;

    // Use imported GraphQL query for WebSocket streams
    const query = WEBSOCKET_STREAMS_QUERY;

    const variables = {
      limit: limit,
      offset: offset,
      scopeId: scopeId,
      order: order,
      filter: {
        code: streamFilter,
      },
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "websocketStreamsByOffset",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch WebSocket streams",
        summary: "Failed to retrieve WebSocket streams from Caido",
      };
    }

    const streams = result.data.streamsByOffset.edges.map(
      (edge: any) => edge.node,
    );
    const pageInfo = result.data.streamsByOffset.pageInfo;

    const streamsSummary = streams
      .map(
        (stream: any) =>
          `ID: ${stream.id} | Host: ${stream.host}:${stream.port} | Path: ${stream.path} | Direction: ${stream.direction} | TLS: ${stream.isTls ? "Yes" : "No"} | Created: ${stream.createdAt}`,
      )
      .join("\n");

    return {
      success: true,
      streams: streams,
      count: streams.length,
      pageInfo: pageInfo,
      summary: `Retrieved ${streams.length} WebSocket streams (offset: ${offset}, limit: ${limit}):\n\n${streamsSummary}`,
      totalAvailable: pageInfo.hasNextPage ? "More available" : "All retrieved",
    };
  } catch (error) {
    sdk.console.error("Error listing WebSocket streams:", error);
    return {
      success: false,
      error: `Failed to list WebSocket streams: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve WebSocket streams due to unexpected error",
    };
  }
};

export const get_websocket_stream = async (sdk: SDK, input: any) => {
  try {
    const id = input.id;
    if (!id) {
      return {
        success: false,
        error: "Stream ID is required",
        summary: "Please provide a WebSocket stream ID",
      };
    }

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: WEBSOCKET_STREAM_QUERY,
      variables: { id },
      operationName: "websocketStream",
    });

    if (!result.success || !result.data?.stream) {
      return {
        success: false,
        error: result.error || "WebSocket stream not found",
        summary: `No stream found with ID: ${id}`,
      };
    }

    const stream = result.data.stream;
    return {
      success: true,
      stream,
      summary: `Stream ${stream.id}: ${stream.protocol} ${stream.host}:${stream.port}${stream.path}`,
    };
  } catch (error) {
    sdk.console.error("Error getting WebSocket stream:", error);
    return {
      success: false,
      error: `Failed to get WebSocket stream: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve WebSocket stream due to unexpected error",
    };
  }
};

export const list_websocket_messages = async (sdk: SDK, input: any) => {
  try {
    const streamId = input.stream_id;
    const limit = input.limit || 50;
    const offset = input.offset || 0;
    const order = input.order || { by: "ID", ordering: "ASC" };
    const filterCode = input.filter_code;
    const includeRaw = input.include_raw === true;
    const includeDecoded = input.include_decoded !== false;

    if (!streamId) {
      return {
        success: false,
        error: "Stream ID is required",
        summary: "Please provide a stream ID to list messages",
      };
    }

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: WEBSOCKET_MESSAGES_QUERY,
      variables: {
        streamId,
        offset,
        limit,
        order,
        filter: filterCode ? { code: filterCode } : null,
      },
      operationName: "websocketMessagesByOffset",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch WebSocket messages",
        summary: `Failed to retrieve messages for stream: ${streamId}`,
      };
    }

    const connection = result.data.streamWsMessagesByOffset;
    const messages = connection.edges.map((edge: any) => {
      const head = edge.node.head;
      const decoded = includeDecoded ? decodeBase64Payload(head.raw) : null;
      const message: any = {
        id: edge.node.id,
        cursor: edge.cursor,
        head_id: head.id,
        length: head.length,
        alteration: head.alteration,
        direction: head.direction,
        format: head.format,
        createdAt: head.createdAt,
        edits: edge.node.edits,
      };

      if (includeRaw) {
        message.raw = head.raw;
      }
      if (includeDecoded) {
        message.raw_decoded = decoded;
        message.raw_preview =
          decoded && decoded.length > 500
            ? `${decoded.slice(0, 500)}...`
            : decoded;
      }

      return message;
    });

    const summary = messages
      .map(
        (message: any) =>
          `ID: ${message.id} | ${message.direction} | ${message.format} | ${message.length} bytes | Created: ${message.createdAt}`,
      )
      .join("\n");

    return {
      success: true,
      stream_id: streamId,
      messages,
      count: messages.length,
      total_count: connection.count?.value,
      pageInfo: connection.pageInfo,
      snapshot: connection.snapshot,
      summary: `Retrieved ${messages.length} WebSocket message(s) for stream ${streamId}:\n\n${summary}`,
    };
  } catch (error) {
    sdk.console.error("Error listing WebSocket messages:", error);
    return {
      success: false,
      error: `Failed to list WebSocket messages: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve WebSocket messages due to unexpected error",
    };
  }
};

export const get_websocket_message_count = async (sdk: SDK, input: any) => {
  try {
    const streamId = input.stream_id;

    if (!streamId) {
      return {
        success: false,
        error: "Stream ID is required",
        summary: "Please provide a stream ID to get message count",
      };
    }

    // Use imported GraphQL query for WebSocket message count
    const query = WEBSOCKET_MESSAGE_COUNT_QUERY;

    const variables = {
      streamId: streamId,
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "websocketMessageCount",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to get WebSocket message count",
        summary: `Failed to get message count for stream: ${streamId}`,
      };
    }

    const countData = result.data.streamWsMessages.count;

    if (!countData) {
      return {
        success: false,
        error: "No count data returned",
        summary: `No count data returned for stream: ${streamId}`,
      };
    }

    const summary = `WebSocket Stream ${streamId} Message Count:
  Total Messages: ${countData.value}
  Snapshot: ${countData.snapshot}`;

    return {
      success: true,
      streamId: streamId,
      count: countData.value,
      snapshot: countData.snapshot,
      summary: summary,
      message: `Successfully retrieved message count for stream ${streamId}`,
    };
  } catch (error) {
    sdk.console.error("Error getting WebSocket message count:", error);
    return {
      success: false,
      error: `Failed to get WebSocket message count: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to get WebSocket message count due to unexpected error",
    };
  }
};

export const get_websocket_message = async (sdk: SDK, input: any) => {
  try {
    const messageId = input.id;

    if (!messageId) {
      return {
        success: false,
        error: "Message ID is required",
        summary: "Please provide a message ID to retrieve",
      };
    }

    // Use imported GraphQL query for WebSocket message details
    const query = WEBSOCKET_MESSAGE_QUERY;

    const variables = {
      id: messageId,
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "websocketMessageEdit",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch WebSocket message",
        summary: `Failed to retrieve WebSocket message with ID: ${messageId}`,
      };
    }

    const message = result.data.streamWsMessageEdit;

    if (!message) {
      return {
        success: false,
        error: "Message not found",
        summary: `No WebSocket message found with ID: ${messageId}`,
      };
    }

    let decodedRaw = "N/A";
    let rawPreview = "N/A";

    if (message.raw) {
      try {
        decodedRaw = decodeBase64Payload(message.raw) || "";
        rawPreview = decodedRaw;
      } catch (decodeError) {
        decodedRaw = "Failed to decode base64 data";
        rawPreview = "Decoding failed";
      }
    }

    const messageSummary = `WebSocket Message Details:
  ID: ${message.id}
  Length: ${message.length} bytes
  Direction: ${message.direction}
  Format: ${message.format}
  Alteration: ${message.alteration}
  Created: ${message.createdAt}
  Raw Data (decoded): ${rawPreview}`;

    return {
      success: true,
      message: message,
      summary: messageSummary,
      details: {
        id: message.id,
        length: message.length,
        direction: message.direction,
        format: message.format,
        alteration: message.alteration,
        createdAt: message.createdAt,
        raw: message.raw,
        raw_decoded: decodedRaw,
      },
    };
  } catch (error) {
    sdk.console.error("Error getting WebSocket message:", error);
    return {
      success: false,
      error: `Failed to get WebSocket message: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve WebSocket message due to unexpected error",
    };
  }
};
