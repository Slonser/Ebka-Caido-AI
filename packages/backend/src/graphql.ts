import type { SDK } from "caido:plugin";

// Interface for GraphQL query options
export interface GraphQLOptions {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
  apiEndpoint?: string;
}

// Interface for GraphQL response
export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

/**
 * Get the saved Caido PAT (Personal Access Token) from database
 */
export const getCaidoPAT = async (sdk: SDK): Promise<string | null> => {
  try {
    const db = await sdk.meta.db();
    const stmt = await db.prepare(
      "SELECT key_value FROM api_keys WHERE key_name = ?",
    );
    const result = await stmt.get("caido-pat");

    if (!result || typeof result !== "object" || !("key_value" in result)) {
      sdk.console.log("No Caido PAT found in database");
      return null;
    }

    const pat = (result as any).key_value;
    sdk.console.log(`Found Caido PAT: ${pat.substring(0, 8)}...`);
    return pat;
  } catch (error) {
    sdk.console.error("Error getting Caido PAT:", error);
    return null;
  }
};

/**
 * Get the saved Caido API endpoint from database
 */
export const getCaidoApiEndpoint = async (sdk: SDK): Promise<string | null> => {
  try {
    const db = await sdk.meta.db();
    const stmt = await db.prepare(
      "SELECT key_value FROM api_keys WHERE key_name = ?",
    );
    const result = await stmt.get("caido-api-endpoint");

    if (!result || typeof result !== "object" || !("key_value" in result)) {
      sdk.console.log("No Caido API endpoint found in database, using default");
      return null;
    }

    const endpoint = (result as any).key_value;
    sdk.console.log(`Found Caido API endpoint: ${endpoint}`);
    return endpoint;
  } catch (error) {
    sdk.console.error("Error getting Caido API endpoint:", error);
    return null;
  }
};

export const executeGraphQLQueryviaSDK = async (
  sdk: SDK,
  options: GraphQLOptions,
): Promise<any> => {
  const { query, variables = {} } = options;
  // @ts-ignore
  const result = await sdk.graphql.execute(query, variables);
  if (result.errors) {
    return {
      success: false,
      error: result.errors,
    };
  }
  return {
    success: true,
    data: result.data,
  };
};
