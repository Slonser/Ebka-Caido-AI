import type { SDK } from "caido:plugin";
import { RequestSpec } from "caido:utils";

export const list_by_httpql = async (sdk: SDK, input: any) => {
  const query = sdk.requests.query().filter(input.httpql);
  const result = await query.execute();

  return {
    count: result.items.length,
    id_list: result.items.map((item: any) => item.request.getId()),
    summary: `Found ${result.items.length} requests matching the query: [${result.items
      .map((item: any) => {
        return JSON.stringify({
          id: item.request.getId(),
          method: item.request.getMethod(),
          host: item.request.getHost(),
          path: item.request.getPath(),
        });
      })
      .join(", ")}]`,
  };
};

export const view_request_by_id = async (sdk: SDK, input: any) => {
  const request = await sdk.requests.get(input.id);
  if (!request) {
    return {
      error: "No request found with id: " + input.id,
      summary: "Request not found",
    };
  }

  return {
    request: "Request ID: " + request.request.getId(),
    summary: `Request details for ID: ${request.request.getRaw().toText()}`,
  };
};

export const view_response_by_id = async (sdk: SDK, input: any) => {
  const response = await sdk.requests.get(input.id);
  if (!response) {
    return {
      error: "No request found with id: " + input.id,
      summary: "Response not found",
    };
  }
  if (!response.response) {
    return {
      error: "No response found for request with id: " + input.id,
      summary: "Response not found",
    };
  }

  return {
    response: "Response ID: " + response.response.getId(),
    summary: `Response details for ID: ${response.response.getRaw().toText()}`,
  };
};

export const sendRequest = async (sdk: SDK, input: any) => {
  const request = new RequestSpec(input.url);
  if (input.raw_request) {
    request.setRaw(input.raw_request);
  } else {
    if (input.method) {
      request.setMethod(input.method);
    }
    if (input.headers) {
      for (const header in input.headers) {
        request.setHeader(header, input.headers[header]);
      }
    }
    if (input.body) {
      request.setBody(input.body);
    }
    if (input.method) {
      request.setMethod(input.method);
    }
    if (input.query) {
      request.setQuery(input.query);
    }
    if (input.host) {
      request.setHost(input.host);
    }
    if (input.port) {
      request.setPort(input.port);
    }
    if (input.tls) {
      request.setTls(input.tls);
    }
    if (input.path) {
      request.setPath(input.path);
    }
    if (input.query) {
      request.setQuery(input.query);
    }
    if (input.method) {
      request.setMethod(input.method);
    }
    if (input.body) {
      request.setBody(input.body);
    }
    if (input.port) {
      request.setPort(input.port);
    }
    if (input.tls) {
      request.setTls(input.tls);
    }
    if (input.path) {
      request.setPath(input.path);
    }
  }
  try {
    const response = await sdk.requests.send(request);
    return {
      success: true,
      response: response,
      summary:
        "Request sent successfully, Response: " +
        response.response.getRaw().toText(),
    };
  } catch (error) {
    sdk.console.error("Error sending request:", error);
    return {
      success: false,
      error: `Failed to send request: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to send request due to unexpected error.",
    };
  }
};
