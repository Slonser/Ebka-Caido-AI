import type { SDK } from "caido:plugin";

export const initializeDatabase = async (sdk: SDK) => {
  try {
    sdk.console.log("Starting database initialization...");

    const db = await sdk.meta.db();
    sdk.console.log("Database connection obtained");

    // Create api_keys table
    const createApiKeysTableStmt = await db.prepare(`
      CREATE TABLE IF NOT EXISTS api_keys (
        key_name TEXT PRIMARY KEY,
        key_value TEXT NOT NULL
      )
    `);
    sdk.console.log("CREATE TABLE statement prepared for api_keys");

    await createApiKeysTableStmt.run();
    sdk.console.log("Database table api_keys created/verified successfully");

    // Create sessions table
    const createSessionsTableStmt = await db.prepare(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    sdk.console.log("CREATE TABLE statement prepared for chat_sessions");

    await createSessionsTableStmt.run();
    sdk.console.log(
      "Database table chat_sessions created/verified successfully",
    );

    // Create messages table
    const createMessagesTableStmt = await db.prepare(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
      )
    `);
    sdk.console.log("CREATE TABLE statement prepared for chat_messages");

    await createMessagesTableStmt.run();
    sdk.console.log(
      "Database table chat_messages created/verified successfully",
    );

    // Create program_results table
    const createProgramResultsTableStmt = await db.prepare(`
      CREATE TABLE IF NOT EXISTS program_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        tool_name TEXT NOT NULL,
        input_data TEXT NOT NULL,
        result_data TEXT NOT NULL,
        summary TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
      )
    `);
    sdk.console.log("CREATE TABLE statement prepared for program_results");

    await createProgramResultsTableStmt.run();
    sdk.console.log(
      "Database table program_results created/verified successfully",
    );

    // Create default session if none exists
    const checkSessionsStmt = await db.prepare(
      "SELECT COUNT(*) as count FROM chat_sessions",
    );
    const sessionCount = await checkSessionsStmt.get();

    if (sessionCount && (sessionCount as any).count === 0) {
      const createDefaultSessionStmt = await db.prepare(`
        INSERT INTO chat_sessions (name) VALUES ('New Chat')
      `);
      await createDefaultSessionStmt.run();
      sdk.console.log("Default session created");
    }
  } catch (error) {
    sdk.console.error("Failed to create database tables:" + error);
  }
};

export const setClaudeApiKey = async (sdk: SDK, apiKey: string) => {
  try {
    sdk.console.log("Starting to set Claude API key...");

    const db = await sdk.meta.db();

    sdk.console.log("Database connection established");

    const stmt = await db.prepare(
      `INSERT OR REPLACE INTO api_keys (key_name, key_value) VALUES (?, ?)`,
    );
    sdk.console.log("SQL statement prepared");

    await stmt.run("claude-api-key", apiKey);
    sdk.console.log("API Key saved to database successfully");

    sdk.console.log(`Claude API Key saved: ${apiKey.substring(0, 8)}...`);

    return { success: true, message: "API Key saved successfully" };
  } catch (error) {
    return {
      success: true,
      message: `Failed to save API key: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

export const getClaudeApiKey = async (sdk: SDK) => {
  try {
    const db = await sdk.meta.db();
    const stmt = await db.prepare(
      "SELECT key_value FROM api_keys WHERE key_name = ?",
    );
    const result = await stmt.get("claude-api-key");

    if (!result || typeof result !== "object" || !("key_value" in result)) {
      return null;
    }

    return (result as any).key_value;
  } catch (error) {
    sdk.console.error("Error getting API key:", error);
    return null;
  }
};

export const getDefaultSessionId = async (sdk: SDK): Promise<number> => {
  try {
    const db = await sdk.meta.db();
    const defaultSessionStmt = await db.prepare(
      "SELECT id FROM chat_sessions ORDER BY created_at ASC LIMIT 1",
    );
    const defaultSession = await defaultSessionStmt.get();
    return (defaultSession as any).id;
  } catch (error) {
    sdk.console.error("Error getting default session ID:", error);
    throw error;
  }
};

export const saveProgramResult = async (
  sdk: SDK,
  sessionId: number,
  toolName: string,
  inputData: any,
  resultData: any,
  summary?: string,
) => {
  try {
    const db = await sdk.meta.db();
    const stmt = await db.prepare(`
      INSERT INTO program_results (session_id, tool_name, input_data, result_data, summary) 
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(
      sessionId,
      toolName,
      JSON.stringify(inputData),
      JSON.stringify(resultData),
      summary || null,
    );

    sdk.console.log(`Program result saved with ID: ${result.lastInsertRowid}`);
    return result.lastInsertRowid;
  } catch (error) {
    sdk.console.error("Error saving program result:", error);
    throw error;
  }
};

export const getProgramResult = async (sdk: SDK, resultId: number) => {
  try {
    const db = await sdk.meta.db();
    const stmt = await db.prepare(`
      SELECT * FROM program_results WHERE id = ?
    `);
    const result = await stmt.get(resultId);

    if (!result) {
      return null;
    }

    return {
      ...result,
      input_data: JSON.parse((result as any).input_data),
      result_data: JSON.parse((result as any).result_data),
    };
  } catch (error) {
    sdk.console.error("Error getting program result:", error);
    return null;
  }
};

export const setCaidoPAT = async (
  sdk: SDK,
  pat: string,
  apiEndpoint?: string,
) => {
  try {
    // Store the PAT (Personal Access Token) in the database
    const db = await sdk.meta.db();

    const stmt = await db.prepare(
      `INSERT OR REPLACE INTO api_keys (key_name, key_value) VALUES (?, ?)`,
    );
    await stmt.run("caido-pat", pat);

    // Store the API endpoint if provided
    if (apiEndpoint) {
      const endpointStmt = await db.prepare(
        `INSERT OR REPLACE INTO api_keys (key_name, key_value) VALUES (?, ?)`,
      );
      await endpointStmt.run("caido-api-endpoint", apiEndpoint);
      sdk.console.log(`Caido API endpoint saved: ${apiEndpoint}`);
    }

    sdk.console.log(`Caido PAT saved: ${pat.substring(0, 8)}...`);
    return {
      success: true,
      message: "PAT and API endpoint saved successfully",
    };
  } catch (error) {
    sdk.console.error("Error saving PAT:", error);
    return {
      success: false,
      message: `Failed to save PAT: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

export const getCaidoPAT = async (sdk: SDK): Promise<string | null> => {
  try {
    const db = await sdk.meta.db();
    const stmt = await db.prepare(
      "SELECT key_value FROM api_keys WHERE key_name = ?",
    );
    const result = await stmt.get("caido-pat");

    if (!result || typeof result !== "object" || !("key_value" in result)) {
      return null;
    }

    return (result as any).key_value;
  } catch (error) {
    sdk.console.error("Error getting Caido PAT:", error);
    return null;
  }
};

export const startAuthenticationFlow = async (sdk: SDK) => {
  try {
    // @ts-ignore
    const result: any = await sdk.graphql.execute(
      `mutation StartAuthenticationFlow {
        startAuthenticationFlow {
          request {
            id
            expiresAt
            userCode
            verificationUrl
          }
        }
      }`,
      {},
    );

    if (result.errors) {
      return {
        success: false,
        error: result.errors.map((e: any) => e.message).join("; "),
      };
    }

    return {
      success: true,
      data: result.data?.startAuthenticationFlow?.request,
    };
  } catch (error) {
    sdk.console.error("Error starting auth flow:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const checkAuthenticationState = async (sdk: SDK, requestId: string) => {
  try {
    // @ts-ignore
    const result: any = await sdk.graphql.execute(
      `query GetAuthState($requestId: ID!) {
        authenticationState(id: $requestId) {
          state
        }
      }`,
      { requestId },
    );

    if (result.errors) {
      return {
        success: false,
        error: result.errors.map((e: any) => e.message).join("; "),
      };
    }

    const state = result.data?.authenticationState?.state;

    if (state === "SUCCESS") {
      // Try to get the token
      // @ts-ignore
      const tokenResult: any = await sdk.graphql.execute(
        `query GetAuthToken($requestId: ID!) {
          authenticationToken(id: $requestId) {
            accessToken
            refreshToken
            expiresAt
          }
        }`,
        { requestId },
      );

      if (tokenResult.errors) {
        return {
          success: false,
          error: tokenResult.errors.map((e: any) => e.message).join("; "),
        };
      }

      const token = tokenResult.data?.authenticationToken;
      if (token?.accessToken) {
        // Save token
        await setCaidoPAT(sdk, token.accessToken);

        if (token.refreshToken) {
          const db = await sdk.meta.db();
          const stmt = await db.prepare(
            `INSERT OR REPLACE INTO api_keys (key_name, key_value) VALUES (?, ?)`,
          );
          await stmt.run("caido-refresh-token", token.refreshToken);
        }

        return {
          success: true,
          ready: true,
          data: token,
        };
      }
    }

    return {
      success: true,
      ready: false,
      state: state,
    };
  } catch (error) {
    sdk.console.error("Error checking auth state:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const saveAuthenticationToken = async (
  sdk: SDK,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: string,
) => {
  try {
    // Save the access token as PAT
    await setCaidoPAT(sdk, accessToken);

    // Optionally save refresh token and expiry
    if (refreshToken) {
      const db = await sdk.meta.db();
      const stmt = await db.prepare(
        `INSERT OR REPLACE INTO api_keys (key_name, key_value) VALUES (?, ?)`,
      );
      await stmt.run("caido-refresh-token", refreshToken);
    }

    return {
      success: true,
      message: "Authentication token saved successfully",
    };
  } catch (error) {
    sdk.console.error("Error saving auth token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
