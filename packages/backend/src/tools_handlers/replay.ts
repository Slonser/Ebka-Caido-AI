import type { SDK } from "caido:plugin";

import { executeGraphQLQueryviaSDK } from "../graphql";
import {
  CREATE_REPLAY_SESSION_COLLECTION_MUTATION,
  getDefaultReplayCollectionsQuery,
  getMoveReplaySessionFragments,
  getRenameReplaySessionCollectionFragments,
  getStartReplayTaskFragments,
  MOVE_REPLAY_SESSION_MUTATION,
  RENAME_REPLAY_SESSION_COLLECTION_MUTATION,
  RENAME_REPLAY_SESSION_MUTATION,
  START_REPLAY_TASK_MUTATION,
} from "../graphql/queries";

export const send_to_replay = async (sdk: SDK, input: any) => {
  try {
    const requestIds = Array.isArray(input.request_ids)
      ? input.request_ids
      : [input.request_ids];
    const collectionName = input.collection_name || "AI Generated";
    const sessionName = input.session_name || "Request from AI";

    sdk.console.log(`Sending ${requestIds.length} request(s) to replay...`);

    // Validate all request IDs first
    const requests = [];
    const invalidIds = [];

    for (const requestId of requestIds) {
      try {
        const request = await sdk.requests.get(requestId);
        if (request) {
          requests.push({ id: requestId, request });
          sdk.console.log(`Request found: ${requestId}`);
        } else {
          invalidIds.push(requestId);
        }
      } catch (error) {
        invalidIds.push(requestId);
        sdk.console.log(`Error getting request ${requestId}: ${error}`);
      }
    }

    if (invalidIds.length > 0) {
      return {
        error: `Invalid request IDs: ${invalidIds.join(", ")}`,
        summary: `Found ${requests.length} valid requests, ${invalidIds.length} invalid IDs`,
      };
    }

    if (requests.length === 0) {
      return {
        error: "No valid requests found",
        summary: "No valid requests to send to replay",
      };
    }

    // Create replay session collection if it doesn't exist
    let collectionId = null;
    try {
      // Try to find existing collection
      const collections = await sdk.replay.getCollections();
      const existingCollection = collections.find(
        (col: any) => col.getName() === collectionName,
      );
      if (existingCollection) {
        collectionId = existingCollection.getId();
        sdk.console.log(
          `Using existing collection: ${collectionName} (ID: ${collectionId})`,
        );
      } else {
        // Try to create the collection using GraphQL
        sdk.console.log(
          `Collection "${collectionName}" not found, attempting to create it...`,
        );
        try {
          const createResult = await create_replay_collection(sdk, {
            name: collectionName,
          });
          if (createResult.success) {
            collectionId = createResult.collection_id;
            sdk.console.log(
              `Successfully created collection "${collectionName}" with ID: ${collectionId}`,
            );
          } else {
            sdk.console.log(
              `Failed to create collection: ${createResult.error}`,
            );
            sdk.console.log(`Will create session without collection`);
          }
        } catch (createError) {
          sdk.console.log(`Error creating collection: ${createError}`);
          sdk.console.log(`Will create session without collection`);
        }
      }
    } catch (error) {
      sdk.console.log(`Could not manage collections: ${error}`);
      // Continue without collection management
    }

    // Create replay session with first request
    let sessionId = null;
    try {
      // Create session with or without collection
      let newSession;
      if (collectionId) {
        newSession = await sdk.replay.createSession(
          requests[0]?.id || requestIds[0],
          collectionId,
        );
      } else {
        newSession = await sdk.replay.createSession(
          requests[0]?.id || requestIds[0],
        );
      }
      sessionId = newSession.getId();
      sdk.console.log(
        `Created replay session: ${sessionName} (ID: ${sessionId}) with first request`,
      );
    } catch (error) {
      sdk.console.log(`Could not create replay session: ${error}`);
      return {
        error: `Failed to create replay session: ${error}`,
        summary: "Failed to create replay session",
      };
    }

    // Add all requests to the replay session
    let additionalRequestsAdded = 0;
    if (requests.length > 1) {
      sdk.console.log(
        `Adding ${requests.length - 1} additional requests to replay session...`,
      );

      for (let i = 1; i < requests.length; i++) {
        const request = requests[i];
        if (request) {
          try {
            sdk.console.log(
              `Adding request ${request.id} to replay session...`,
            );

            // Try to add the request to the existing session
            // If the SDK doesn't support adding to existing sessions, create a new one
            if (collectionId) {
              await sdk.replay.createSession(request.id, collectionId);
            } else {
              await sdk.replay.createSession(request.id);
            }

            additionalRequestsAdded++;
            sdk.console.log(
              `Successfully added request ${request.id} to replay session`,
            );
          } catch (addError) {
            sdk.console.log(
              `Could not add request ${request.id} to replay session: ${addError}`,
            );
            // Continue with other requests even if one fails
          }
        }
      }

      if (additionalRequestsAdded > 0) {
        sdk.console.log(
          `Successfully added ${additionalRequestsAdded} additional requests to replay session`,
        );
      }
    }

    return {
      success: true,
      request_ids: requestIds,
      valid_requests: requests.length,
      invalid_requests: invalidIds.length,
      additional_requests_processed: additionalRequestsAdded,
      collection_name: collectionName,
      session_name: sessionName,
      collection_id: collectionId,
      session_id: sessionId,
      request_details: requests.map((req) => ({
        id: req.id,
        request_string: req.request.request.getRaw().toText(),
        summary: "Request details available as string",
      })),
      summary: `${requests.length} request(s) processed. Session "${sessionName}" (ID: ${sessionId}) created with first request. ${additionalRequestsAdded > 0 ? `${additionalRequestsAdded} additional requests added to replay session.` : "All requests added to replay session."}`,
    };
  } catch (error) {
    sdk.console.error("Error in send_to_replay:", error);
    return {
      error: `Failed to send request to replay: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to send request to replay",
    };
  }
};

export const list_replay_collections = async (sdk: SDK, input: any) => {
  try {
    const includeSessions = input.include_sessions || false;
    const filterName = input.filter_name || "";

    sdk.console.log("Listing replay collections...");

    // Get all collections
    const collections = await sdk.replay.getCollections();
    sdk.console.log(`Found ${collections.length} collections`);

    // Filter collections by name if filter is provided
    let filteredCollections = collections;
    if (filterName) {
      filteredCollections = collections.filter((col: any) =>
        col.getName().toLowerCase().includes(filterName.toLowerCase()),
      );
      sdk.console.log(
        `Filtered to ${filteredCollections.length} collections matching "${filterName}"`,
      );
    }

    // Process collections
    const processedCollections = filteredCollections.map((collection: any) => {
      const collectionData: any = {
        id: collection.getId(),
        name: collection.getName(),
        type: "collection",
      };

      // Include sessions if requested
      if (includeSessions) {
        try {
          // Note: The current SDK doesn't provide a direct method to get sessions by collection
          // So we'll indicate this limitation
          collectionData.sessions = {
            note: "Session listing not available in current SDK",
            count: "Unknown",
          };
        } catch (error) {
          collectionData.sessions = {
            error: `Failed to get sessions: ${error}`,
            count: 0,
          };
        }
      }

      return collectionData;
    });

    // Sort collections by name
    processedCollections.sort((a: any, b: any) => a.name.localeCompare(b.name));

    return {
      success: true,
      total_collections: collections.length,
      filtered_collections: filteredCollections.length,
      collections: processedCollections,
      collection_ids: processedCollections.map((col: any) => col.id),
      filter_applied: filterName || null,
      include_sessions: includeSessions,
      summary: `Found ${filteredCollections.length} replay collection(s)${filterName ? ` matching "${filterName}"` : ""}: ${processedCollections.map((col: any) => col.id).join(", ")}`,
    };
  } catch (error) {
    sdk.console.error("Error listing replay collections:", error);
    return {
      error: `Failed to list replay collections: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to list replay collections",
    };
  }
};

export const rename_replay_collection = async (sdk: SDK, input: any) => {
  try {
    const collectionId = input.collection_id;
    const newName = input.new_name;
    const verifyExisting = input.verify_existing !== false; // Default to true

    sdk.console.log(`Renaming collection ${collectionId} to "${newName}"...`);

    // Validate input
    if (!newName.trim()) {
      return {
        error: "New name cannot be empty",
        summary: "Invalid new name: new name cannot be empty",
      };
    }

    // Get all collections to find the target collection and check for name conflicts
    const collections = await sdk.replay.getCollections();

    // Find the target collection
    const targetCollection = collections.find(
      (col: any) => col.getId() === collectionId,
    );
    if (!targetCollection) {
      return {
        error: `No collection found with ID: ${collectionId}`,
        summary: "Collection not found",
      };
    }

    const oldName = targetCollection.getName();
    sdk.console.log(`Found collection: "${oldName}" (ID: ${collectionId})`);

    // Check if new name is the same as current name
    if (oldName === newName) {
      return {
        success: true,
        collection_id: collectionId,
        old_name: oldName,
        new_name: newName,
        message: "Collection name is already the requested name",
        summary: `Collection "${oldName}" already has the name "${newName}"`,
      };
    }

    // Check for name conflicts if verification is enabled
    if (verifyExisting) {
      const existingCollection = collections.find(
        (col: any) =>
          col.getId() !== collectionId &&
          col.getName().toLowerCase() === newName.toLowerCase(),
      );

      if (existingCollection) {
        return {
          error: `A collection with name "${newName}" already exists (ID: ${existingCollection.getId()})`,
          summary: "Collection name already exists",
        };
      }
    }

    // Attempt to rename the collection using GraphQL
    try {
      sdk.console.log(
        `Renaming collection from "${oldName}" to "${newName}" using GraphQL...`,
      );

      // Use GraphQL mutation to rename the collection with specific fragments
      const query =
        RENAME_REPLAY_SESSION_COLLECTION_MUTATION +
        "\n" +
        getRenameReplaySessionCollectionFragments();

      const variables = {
        id: collectionId,
        name: newName,
      };

      const result = await executeGraphQLQueryviaSDK(sdk, {
        query,
        variables,
        operationName: "renameReplaySessionCollection",
      });

      if (
        result.success &&
        result.data?.renameReplaySessionCollection?.collection
      ) {
        const collection = result.data.renameReplaySessionCollection.collection;
        sdk.console.log(`Successfully renamed collection to "${newName}"`);

        return {
          success: true,
          collection_id: collection.id,
          old_name: oldName,
          new_name: collection.name,
          collection_details: collection,
          message: `Collection successfully renamed to "${newName}"`,
          summary: `Collection "${oldName}" renamed to "${newName}"`,
        };
      } else {
        return {
          error:
            result.error ||
            "Failed to rename collection - no collection data returned",
          summary: "Collection rename failed",
        };
      }
    } catch (graphqlError) {
      sdk.console.error(`GraphQL error renaming collection: ${graphqlError}`);
      return {
        error: `GraphQL error: ${graphqlError instanceof Error ? graphqlError.message : "Unknown GraphQL error"}`,
        summary: "Failed to rename collection via GraphQL",
      };
    }
  } catch (error) {
    sdk.console.error("Error in rename_replay_collection:", error);
    return {
      error: `Failed to rename collection: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to rename collection",
    };
  }
};

export const rename_replay_session = async (sdk: SDK, input: any) => {
  try {
    const sessionId = input.session_id;
    const newName = input.new_name;

    sdk.console.log(`Renaming replay session ${sessionId} to "${newName}"...`);

    // Validate input
    if (!newName.trim()) {
      return {
        error: "New name cannot be empty",
        summary: "Invalid new name",
      };
    }

    // Use imported GraphQL mutation for renaming replay session
    const mutation = RENAME_REPLAY_SESSION_MUTATION;

    const variables = {
      id: sessionId,
      name: newName,
    };

    try {
      const result = await executeGraphQLQueryviaSDK(sdk, {
        query: mutation,
        variables: variables,
        operationName: "renameReplaySession",
      });

      if (result.success && result.data?.renameReplaySession?.session) {
        const session = result.data.renameReplaySession.session;
        sdk.console.log(`Successfully renamed session to "${newName}"`);

        return {
          success: true,
          session_id: sessionId,
          new_name: newName,
          session_details: {
            id: session.id,
            name: session.name,
          },
          summary: `Replay session successfully renamed to "${newName}"`,
        };
      } else {
        return {
          error:
            result.error ||
            "Failed to rename session - no session data returned",
          summary: "Rename operation failed",
        };
      }
    } catch (graphqlError) {
      sdk.console.error(`GraphQL error renaming session: ${graphqlError}`);
      return {
        error: `GraphQL error: ${graphqlError instanceof Error ? graphqlError.message : "Unknown GraphQL error"}`,
        summary: "Failed to rename session via GraphQL",
      };
    }
  } catch (error) {
    sdk.console.error("Error in rename_replay_session:", error);
    return {
      error: `Failed to rename replay session: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to rename replay session",
    };
  }
};

export const graphql_collection_requests = async (sdk: SDK, input: any) => {
  try {
    const collectionId = input.collection_id;
    const customQuery = input.graphql_query;
    const variables = input.variables || {};

    sdk.console.log(
      `Executing GraphQL query for collection ${collectionId}...`,
    );

    // Use the default query or custom query
    const queryToExecute = customQuery || getDefaultReplayCollectionsQuery();
    const queryVariables = { collectionId, ...variables };

    sdk.console.log("GraphQL Query:", queryToExecute.substring(0, 100) + "...");
    sdk.console.log("Variables:", JSON.stringify(queryVariables, null, 2));

    // Execute the GraphQL query using our helper function
    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: queryToExecute,
      variables: queryVariables,
      operationName: "replaySessionCollections",
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        graphql_query: queryToExecute,
        variables: queryVariables,
        summary: "GraphQL query execution failed",
      };
    }

    // Parse and process the response
    if (result.data && result.data.replaySessionCollections) {
      const collections = result.data.replaySessionCollections.edges;

      // Find the specific collection if collectionId is provided
      let targetCollection = null;
      if (collectionId) {
        targetCollection = collections.find(
          (edge: any) => edge.node.id === collectionId,
        );
      }

      // If we found the target collection, add its details
      const requestsData: Array<{
        request_id: string;
        session_id: string;
        name: string;
      }> = [];

      if (targetCollection) {
        const collection = targetCollection.node;

        // Extract all requests with their session information
        sdk.console.log(
          `Processing ${collection.sessions.length} sessions in collection`,
        );
        collection.sessions.forEach((session: any) => {
          sdk.console.log(
            `Session: ${session.id} - "${session.name}" with ${session.entries.nodes.length} entries`,
          );
          session.entries.nodes.forEach((entry: any) => {
            if (entry.request) {
              sdk.console.log(
                `Entry: ${entry.id}, Request: ${entry.request.id}, Session: ${entry.session.id} - "${entry.session.name}"`,
              );
              requestsData.push({
                request_id: entry.request.id,
                session_id: entry.session.id,
                name: entry.session.name,
              });
            }
          });
        });
      }

      const response: any = {
        success: true,
        collection_id: collectionId,
        graphql_query: queryToExecute,
        variables: queryVariables,
        total_collections_found: collections.length,
        target_collection_found: !!targetCollection,
        total_requests_found: requestsData.length,
        requests: requestsData,
        response_data: result.data,
        summary: `GraphQL query executed successfully. Found ${collections.length} collections.${targetCollection ? ` Target collection ${collectionId} found with ${requestsData.length} requests.` : ""}`,
      };

      // If we found the target collection, add its details
      if (targetCollection) {
        const collection = targetCollection.node;

        response.target_collection_details = {
          id: collection.id,
          name: collection.name,
          sessions_count: collection.sessions.length,
          total_requests: requestsData.length,
          requests: requestsData,
          sessions: collection.sessions.map((session: any) => ({
            id: session.id,
            name: session.name,
            entries_count: session.entries.nodes.length,
            has_active_entry: !!session.activeEntry,
            active_entry_request: session.activeEntry?.request
              ? {
                  id: session.activeEntry.request.id,
                  method: session.activeEntry.request.method,
                  host: session.activeEntry.request.host,
                  path: session.activeEntry.request.path,
                  status_code: session.activeEntry.request.response?.statusCode,
                }
              : null,
          })),
        };
      }

      return response;
    } else {
      return {
        success: false,
        error: "Invalid response structure from GraphQL API",
        response_data: result.data,
        summary: "GraphQL query executed but response structure is invalid",
      };
    }
  } catch (error) {
    sdk.console.error("Error in graphql_collection_requests:", error);
    return {
      error: `Failed to prepare GraphQL query: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to prepare GraphQL query",
    };
  }
};

export const graphql_list_collections = async (sdk: SDK, input: any) => {
  try {
    const includeSessions = input.include_sessions || false;
    const filterName = input.filter_name;

    sdk.console.log("Listing all replay collections using GraphQL API...");

    // Execute the GraphQL query using our helper function
    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: getDefaultReplayCollectionsQuery(),
      variables: {},
      operationName: "replaySessionCollections",
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        summary: "Failed to fetch collections from GraphQL API",
      };
    }

    // Parse and process the response
    if (result.data && result.data.replaySessionCollections) {
      let collections = result.data.replaySessionCollections.edges;

      // Apply name filter if specified
      if (filterName) {
        collections = collections.filter((edge: any) =>
          edge.node.name.toLowerCase().includes(filterName.toLowerCase()),
        );
      }

      // Process collections
      const processedCollections = collections.map((edge: any) => {
        const collection = edge.node;
        const collectionData: any = {
          id: collection.id,
          name: collection.name,
          sessions_count: collection.sessions.length,
        };

        // Include session details if requested
        if (includeSessions) {
          collectionData.sessions = collection.sessions.map((session: any) => ({
            id: session.id,
            name: session.name,
            entries_count: session.entries.nodes.length,
            has_active_entry: !!session.activeEntry,
            active_entry_request: session.activeEntry?.request
              ? {
                  id: session.activeEntry.request.id,
                  method: session.activeEntry.request.method,
                  host: session.activeEntry.request.host,
                  path: session.activeEntry.request.path,
                  status_code: session.activeEntry.request.response?.statusCode,
                }
              : null,
            // Add sample entries for AI analysis
            sample_entries: session.entries.nodes
              .slice(0, 5)
              .map((entry: any) => ({
                id: entry.id,
                error: entry.error,
                connection_host: entry.connection?.host || null,
                connection_port: entry.connection?.port || null,
                request_method: entry.request?.method || null,
                request_path: entry.request?.path || null,
                response_status: entry.request?.response?.statusCode || null,
              })),
          }));
        }

        return collectionData;
      });

      return {
        success: true,
        total_collections: collections.length,
        filtered_collections: processedCollections.length,
        collections: processedCollections,
        collection_ids: processedCollections.map((col: any) => col.id),
        include_sessions: includeSessions,
        filter_applied: !!filterName,
        filter_name: filterName || null,
        summary: `Successfully retrieved ${processedCollections.length} collections from GraphQL API${filterName ? ` (filtered by: ${filterName})` : ""}: ${processedCollections.map((col: any) => col.id).join(", ")}`,
      };
    } else {
      return {
        success: false,
        error: "Invalid response structure from GraphQL API",
        response_data: result.data,
        summary: "GraphQL query executed but response structure is invalid",
      };
    }
  } catch (error) {
    sdk.console.error("Error in graphql_list_collections:", error);
    return {
      error: `Failed to list collections: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to list collections",
    };
  }
};

export const list_replay_connections = async (sdk: SDK, input: any) => {
  try {
    const collectionName = input.collection_name;
    const collectionId = input.collection_id;
    const limit = input.limit;

    // Validate input - need either collection_name or collection_id
    if (!collectionName && !collectionId) {
      return {
        success: false,
        error: "Either collection_name or collection_id must be provided",
        summary: "Missing collection identifier",
      };
    }

    sdk.console.log(
      `Listing replay connections in collection: ${collectionName || collectionId}...`,
    );

    // Execute the GraphQL query using our helper function
    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: getDefaultReplayCollectionsQuery(),
      variables: {},
      operationName: "replaySessionCollections",
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        summary: "Failed to fetch collections from GraphQL API",
      };
    }

    // Parse and process the response
    if (result.data && result.data.replaySessionCollections) {
      const collections = result.data.replaySessionCollections.edges;

      // Find the target collection
      let targetCollection = null;
      if (collectionId) {
        targetCollection = collections.find(
          (edge: any) => edge.node.id === collectionId,
        );
      } else if (collectionName) {
        targetCollection = collections.find((edge: any) =>
          edge.node.name.toLowerCase().includes(collectionName.toLowerCase()),
        );
      }

      if (!targetCollection) {
        return {
          success: false,
          error: `Collection not found: ${collectionName || collectionId}`,
          summary: "Collection not found",
        };
      }

      const collection = targetCollection.node;
      sdk.console.log(
        `Found collection: "${collection.name}" (ID: ${collection.id})`,
      );

      // Collect all connections from the collection
      let connections: any[] = [];

      collection.sessions.forEach((session: any) => {
        session.entries.nodes.forEach((entry: any) => {
          if (entry.connection) {
            connections.push({
              id: entry.id,
              host: entry.connection.host,
              port: entry.connection.port,
              isTLS: entry.connection.isTLS,
              SNI: entry.connection.SNI,
              session_id: session.id,
              session_name: session.name,
              request_method: entry.request?.method || "Unknown",
              request_path: entry.request?.path || "Unknown",
              request_query: entry.request?.query || null,
              request_length: entry.request?.length || null,
              request_source: entry.request?.source || null,
              request_created_at: entry.request?.createdAt || null,
              response_status: entry.request?.response?.statusCode || null,
              response_length: entry.request?.response?.length || null,
              response_roundtrip_time:
                entry.request?.response?.roundtripTime || null,
              error: entry.error,
              metadata_color: entry.request?.metadata?.color || null,
            });
          }
        });
      });

      // Apply limit if specified
      if (limit && limit > 0) {
        connections = connections.slice(0, limit);
      }

      const response: any = {
        success: true,
        collection_id: collection.id,
        collection_name: collection.name,
        total_connections: connections.length,
        connections: connections,
        connection_ids: connections.map((conn: any) => conn.id),
        summary: `Found ${connections.length} connections in collection "${collection.name}": ${connections.map((conn: any) => conn.id).join(", ")}`,
      };

      return response;
    } else {
      return {
        success: false,
        error: "Invalid response structure from GraphQL API",
        response_data: result.data,
        summary: "GraphQL query executed but response structure is invalid",
      };
    }
  } catch (error) {
    sdk.console.error("Error in list_replay_connections:", error);
    return {
      error: `Failed to list replay connections: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to list replay connections",
    };
  }
};

export const create_replay_collection = async (sdk: SDK, input: any) => {
  try {
    const name = input.name;

    if (!name || typeof name !== "string") {
      return {
        success: false,
        error: "Collection name is required and must be a string",
      };
    }

    sdk.console.log(`Creating replay collection: "${name}"...`);

    // Validate input
    if (!name.trim()) {
      return {
        error: "Collection name cannot be empty",
        summary: "Invalid collection name",
      };
    }

    // Use imported GraphQL mutation for creating replay session collection
    const mutation = CREATE_REPLAY_SESSION_COLLECTION_MUTATION;

    const variables = {
      input: {
        name: name,
      },
    };

    try {
      const result = await executeGraphQLQueryviaSDK(sdk, {
        query: mutation,
        variables: variables,
        operationName: "createReplaySessionCollection",
      });

      if (
        result.success &&
        result.data?.createReplaySessionCollection?.collection
      ) {
        const collection = result.data.createReplaySessionCollection.collection;
        sdk.console.log(
          `Successfully created collection "${name}" with ID: ${collection.id}`,
        );

        return {
          success: true,
          collection_id: collection.id,
          name: name,
          collection_details: {
            id: collection.id,
            name: collection.name,
          },
          summary: `Replay collection "${name}" successfully created with ID ${collection.id}`,
        };
      } else {
        return {
          error: JSON.stringify(result),
          summary: "Collection creation failed",
        };
      }
    } catch (graphqlError) {
      sdk.console.error(`GraphQL error creating collection: ${graphqlError}`);
      return {
        error: `GraphQL error: ${graphqlError instanceof Error ? graphqlError.message : "Unknown GraphQL error"}`,
        summary: "Failed to create collection via GraphQL",
      };
    }
  } catch (error) {
    sdk.console.error("Error in create_replay_collection:", error);
    return {
      error: `Failed to create replay collection: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to create replay collection",
    };
  }
};

export const move_replay_session = async (sdk: SDK, input: any) => {
  try {
    const sessionId = input.id;
    const collectionId = input.collection_id;

    if (!sessionId) {
      return {
        success: false,
        error: "Session ID is required",
        summary: "Please provide a session ID to move",
      };
    }

    if (!collectionId) {
      return {
        success: false,
        error: "Collection ID is required",
        summary: "Please provide a target collection ID",
      };
    }

    // Use imported GraphQL mutation for moving replay session with specific fragments
    const query =
      MOVE_REPLAY_SESSION_MUTATION + "\n" + getMoveReplaySessionFragments();

    const variables = {
      id: sessionId,
      collectionId: collectionId,
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "moveReplaySession",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to move replay session",
        summary: `Failed to move session ${sessionId} to collection ${collectionId}`,
      };
    }

    const moveResult = result.data.moveReplaySession;

    if (!moveResult.session) {
      return {
        success: false,
        error: "No session returned after move",
        summary: `Move completed but no session data returned for ID: ${sessionId}`,
      };
    }

    const session = moveResult.session;

    const sessionSummary = `Successfully moved replay session:
  Session ID: ${session.id}
  Session Name: ${session.name}
  New Collection ID: ${session.collection?.id || "N/A"}
  Active Entry: ${session.activeEntry ? `ID: ${session.activeEntry.id}` : "None"}
  Total Entries: ${session.entries?.nodes?.length || 0}`;

    return {
      success: true,
      session: session,
      summary: sessionSummary,
      message: `Session ${sessionId} moved to collection ${collectionId} successfully`,
    };
  } catch (error) {
    sdk.console.error("Error moving replay session:", error);
    return {
      success: false,
      error: `Failed to move replay session: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to move replay session due to unexpected error",
    };
  }
};

export const start_replay_task = async (sdk: SDK, input: any) => {
  try {
    const sessionId = input.session_id;
    const rawRequest = input.raw_request + "\r\n\r\n";
    const connection = input.connection;
    const settings = input.settings || {};

    if (!sessionId) {
      return {
        success: false,
        error: "Session ID is required",
        summary: "Please provide a session ID to start replay task",
      };
    }

    if (!rawRequest) {
      return {
        success: false,
        error: "Raw request is required",
        summary: "Please provide a raw HTTP request to replay",
      };
    }

    // Encode raw request to base64
    const base64Request = Buffer.from(rawRequest, "utf8").toString("base64");

    // Use imported GraphQL mutation for starting replay task with specific fragments
    const query =
      START_REPLAY_TASK_MUTATION + "\n" + getStartReplayTaskFragments();

    const variables = {
      sessionId: sessionId,
      input: {
        connection: connection || {
          host: "localhost",
          port: 80,
          isTLS: false,
          SNI: null,
        },
        raw: base64Request,
        settings: {
          placeholders: settings.placeholders || [],
          updateContentLength: settings.updateContentLength !== false,
        },
      },
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "startReplayTask",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to start replay task",
        summary: `Failed to start replay task for session: ${sessionId}`,
      };
    }

    const startResult = result.data.startReplayTask;

    if (startResult.error) {
      return {
        success: false,
        error: `Task start failed with error code: ${startResult.error.code}`,
        summary: `Failed to start replay task: ${startResult.error.code}`,
        details: startResult.error,
      };
    }

    const task = startResult.task;

    if (!task) {
      return {
        success: false,
        error: "No task returned after start",
        summary: `Task start completed but no task data returned for session: ${sessionId}`,
      };
    }

    const taskSummary = `Successfully started replay task:
  Task ID: ${task.id}
  Task Created: ${task.createdAt}
  Session ID: ${task.replayEntry?.session?.id || "N/A"}
  Entry ID: ${task.replayEntry?.id || "N/A"}
  Connection: ${task.replayEntry?.connection ? `${task.replayEntry.connection.host}:${task.replayEntry.connection.port} (${task.replayEntry.connection.isTLS ? "TLS" : "HTTP"})` : "N/A"}
  Request Method: ${task.replayEntry?.request?.method || "N/A"}
  Request Path: ${task.replayEntry?.request?.path || "N/A"}`;

    return {
      success: true,
      task: task,
      summary: taskSummary,
      message: `Replay task started successfully for session ${sessionId}`,
      taskId: task.id,
    };
  } catch (error) {
    sdk.console.error("Error starting replay task:", error);
    return {
      success: false,
      error: `Failed to start replay task: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to start replay task due to unexpected error",
    };
  }
};
