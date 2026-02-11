import type { SDK } from "caido:plugin";

export const createSession = async (sdk: SDK, name: string) => {
  try {
    const db = await sdk.meta.db();
    const stmt = await db.prepare(`
      INSERT INTO chat_sessions (name) VALUES (?)
    `);
    const result = await stmt.run(name);

    sdk.console.log(
      `New session created: ${name} with ID ${result.lastInsertRowid}`,
    );

    return {
      success: true,
      sessionId: result.lastInsertRowid,
      message: "Session created successfully",
    };
  } catch (error) {
    sdk.console.error("Error creating session:" + error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getSessions = async (sdk: SDK) => {
  try {
    const db = await sdk.meta.db();
    const stmt = await db.prepare(`
      SELECT id, name, created_at, updated_at FROM chat_sessions 
      ORDER BY updated_at DESC
    `);
    const sessions = await stmt.all();

    sdk.console.log(`Retrieved ${sessions.length} sessions`);

    return {
      success: true,
      sessions: sessions,
    };
  } catch (error) {
    sdk.console.error("Error getting sessions:" + error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const getSessionMessages = async (sdk: SDK, sessionId: number) => {
  try {
    const db = await sdk.meta.db();
    const stmt = await db.prepare(`
      SELECT id, role, content, timestamp FROM chat_messages 
      WHERE session_id = ? 
      ORDER BY timestamp ASC
    `);
    const messages = await stmt.all(sessionId);

    sdk.console.log(
      `Retrieved ${messages.length} messages for session ${sessionId}`,
    );

    return {
      success: true,
      messages: messages,
    };
  } catch (error) {
    sdk.console.error("Error getting session messages:" + error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const renameSession = async (
  sdk: SDK,
  sessionId: number,
  newName: string,
) => {
  try {
    const db = await sdk.meta.db();
    const stmt = await db.prepare(`
      UPDATE chat_sessions SET name = ? WHERE id = ?
    `);
    await stmt.run(newName, sessionId);

    sdk.console.log(`Session ${sessionId} renamed to: ${newName}`);

    return {
      success: true,
      message: "Session renamed successfully",
    };
  } catch (error) {
    sdk.console.error("Error renaming session:" + error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const deleteSession = async (sdk: SDK, sessionId: number) => {
  try {
    const db = await sdk.meta.db();

    // Delete messages first (due to foreign key constraint)
    const deleteMessagesStmt = await db.prepare(`
      DELETE FROM chat_messages WHERE session_id = ?
    `);
    await deleteMessagesStmt.run(sessionId);

    // Delete session
    const deleteSessionStmt = await db.prepare(`
      DELETE FROM chat_sessions WHERE id = ?
    `);
    await deleteSessionStmt.run(sessionId);

    sdk.console.log(`Session ${sessionId} deleted successfully`);

    return {
      success: true,
      message: "Session deleted successfully",
    };
  } catch (error) {
    sdk.console.error("Error deleting session:" + error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const saveMessage = async (
  sdk: SDK,
  sessionId: number,
  role: string,
  content: string,
) => {
  try {
    const db = await sdk.meta.db();
    const stmt = await db.prepare(`
      INSERT INTO chat_messages (session_id, role, content) VALUES (?, ?, ?)
    `);
    await stmt.run(sessionId, role, content);

    // Update session updated_at timestamp
    const updateSessionStmt = await db.prepare(`
      UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    await updateSessionStmt.run(sessionId);
  } catch (error) {
    sdk.console.error("Error saving message:", error);
    throw error;
  }
};

export const getConversationHistory = async (sdk: SDK, sessionId: number) => {
  try {
    const db = await sdk.meta.db();
    const historyStmt = await db.prepare(`
      SELECT role, content FROM chat_messages 
      WHERE session_id = ? 
      ORDER BY timestamp ASC
    `);
    const history = await historyStmt.all(sessionId);

    return history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));
  } catch (error) {
    sdk.console.error("Error getting conversation history:", error);
    throw error;
  }
};
