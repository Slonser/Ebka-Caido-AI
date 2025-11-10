import type { SDK } from "caido:plugin";

import { executeGraphQLQueryviaSDK } from "../graphql";
import {
  CREATE_SCOPE_MUTATION,
  DELETE_SCOPE_MUTATION,
  SCOPES_QUERY,
  UPDATE_SCOPE_MUTATION,
} from "../graphql/queries";

export const list_scopes = async (sdk: SDK, input: any) => {
  try {
    // Use imported GraphQL query for listing scopes
    const query = SCOPES_QUERY;

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      operationName: "scopes",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch scopes",
        summary: "Failed to retrieve scopes from Caido",
      };
    }

    const scopes = result.data.scopes || [];

    // Формируем подробный summary с данными каждого scope
    const scopesSummary = scopes
      .map(
        (scope: any) =>
          `ID: ${scope.id} | Name: ${scope.name} | Allowlist: [${scope.allowlist.join(", ") || "Empty"}] | Denylist: [${scope.denylist.join(", ") || "Empty"}]`,
      )
      .join("\n");

    return {
      success: true,
      scopes: scopes,
      count: scopes.length,
      summary: `Retrieved ${scopes.length} scopes:\n\n${scopesSummary}`,
      message: `Successfully retrieved ${scopes.length} scopes`,
    };
  } catch (error) {
    sdk.console.error("Error listing scopes:", error);
    return {
      success: false,
      error: `Failed to list scopes: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve scopes due to unexpected error",
    };
  }
};

export const create_scope = async (sdk: SDK, input: any) => {
  try {
    const { name, allowlist, denylist } = input;

    if (!name) {
      return {
        success: false,
        error: "Scope name is required",
        summary: "Please provide a name for the scope",
      };
    }

    // Use imported GraphQL mutation for creating scope
    const query = CREATE_SCOPE_MUTATION;

    const variables = {
      input: {
        name: name,
        allowlist: allowlist || [],
        denylist: denylist || [],
      },
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "createScope",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to create scope",
        summary: `Failed to create scope: ${name}`,
      };
    }

    const createResult = result.data.createScope;

    if (createResult.error) {
      return {
        success: false,
        error: `Creation failed with error code: ${createResult.error.code}`,
        summary: `Failed to create scope: ${createResult.error.code}`,
        details: createResult.error,
      };
    }

    const scope = createResult.scope;

    if (!scope) {
      return {
        success: false,
        error: "No scope returned after creation",
        summary: `Creation completed but no scope data returned for: ${name}`,
      };
    }

    const summary = `Successfully created scope:
  ID: ${scope.id}
  Name: ${scope.name}
  Allowlist: [${scope.allowlist.join(", ") || "Empty"}]
  Denylist: [${scope.denylist.join(", ") || "Empty"}]`;

    return {
      success: true,
      scope: scope,
      summary: summary,
      message: `Scope "${name}" created successfully`,
    };
  } catch (error) {
    sdk.console.error("Error creating scope:", error);
    return {
      success: false,
      error: `Failed to create scope: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to create scope due to unexpected error",
    };
  }
};

export const update_scope = async (sdk: SDK, input: any) => {
  try {
    const { id, name, allowlist, denylist } = input;

    if (!id) {
      return {
        success: false,
        error: "Scope ID is required",
        summary: "Please provide a scope ID to update",
      };
    }

    if (!name && allowlist === undefined && denylist === undefined) {
      return {
        success: false,
        error: "At least one field to update is required",
        summary: "Please provide name, allowlist, or denylist to update",
      };
    }

    // Use imported GraphQL mutation for updating scope
    const query = UPDATE_SCOPE_MUTATION;

    const updateInput: any = {};
    if (name !== undefined) updateInput.name = name;
    if (allowlist !== undefined) updateInput.allowlist = allowlist;
    if (denylist !== undefined) updateInput.denylist = denylist;

    const variables = {
      id: id,
      input: updateInput,
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "updateScope",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to update scope",
        summary: `Failed to update scope with ID: ${id}`,
      };
    }

    const updateResult = result.data.updateScope;

    if (updateResult.error) {
      return {
        success: false,
        error: `Update failed with error code: ${updateResult.error.code}`,
        summary: `Failed to update scope: ${updateResult.error.code}`,
        details: updateResult.error,
      };
    }

    const scope = updateResult.scope;

    if (!scope) {
      return {
        success: false,
        error: "No scope returned after update",
        summary: `Update completed but no scope data returned for ID: ${id}`,
      };
    }

    const summary = `Successfully updated scope:
  ID: ${scope.id}
  Name: ${scope.name}
  Allowlist: [${scope.allowlist.join(", ") || "Empty"}]
  Denylist: [${scope.denylist.join(", ") || "Empty"}]`;

    return {
      success: true,
      scope: scope,
      summary: summary,
      message: `Scope ${id} updated successfully`,
    };
  } catch (error) {
    sdk.console.error("Error updating scope:", error);
    return {
      success: false,
      error: `Failed to update scope: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to update scope due to unexpected error",
    };
  }
};

export const delete_scope = async (sdk: SDK, input: any) => {
  try {
    const scopeId = input.id;

    if (!scopeId) {
      return {
        success: false,
        error: "Scope ID is required",
        summary: "Please provide a scope ID to delete",
      };
    }

    // Use imported GraphQL mutation for deleting scope
    const query = DELETE_SCOPE_MUTATION;

    const variables = {
      id: scopeId,
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "deleteScope",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to delete scope",
        summary: `Failed to delete scope with ID: ${scopeId}`,
      };
    }

    const deleteResult = result.data.deleteScope;
    const deletedId = deleteResult.deletedId;

    if (!deletedId) {
      return {
        success: false,
        error: "No scope was deleted",
        summary: `No scope was deleted. ID: ${scopeId}`,
      };
    }

    const summary = `Successfully deleted scope:
  Deleted ID: ${deletedId}`;

    return {
      success: true,
      deletedId: deletedId,
      summary: summary,
      message: `Scope ${scopeId} deleted successfully`,
    };
  } catch (error) {
    sdk.console.error("Error deleting scope:", error);
    return {
      success: false,
      error: `Failed to delete scope: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to delete scope due to unexpected error",
    };
  }
};
