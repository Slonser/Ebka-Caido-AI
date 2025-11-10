import type { SDK } from "caido:plugin";

import { executeGraphQLQueryviaSDK } from "../graphql";
import {
  CREATE_FILTER_PRESET_MUTATION,
  DELETE_FILTER_PRESET_MUTATION,
  FILTER_PRESETS_QUERY,
  UPDATE_FILTER_PRESET_MUTATION,
} from "../graphql/queries";

export const list_filter_presets = async (sdk: SDK, input: any) => {
  try {
    // Use imported GraphQL query for listing filter presets
    const query = FILTER_PRESETS_QUERY;

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      operationName: "filterPresets",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch filter presets",
        summary: "Failed to retrieve filter presets from Caido",
      };
    }

    const filterPresets = result.data.filterPresets || [];

    const filtersSummary = filterPresets
      .map(
        (filter: any) =>
          `ID: ${filter.id} | Alias: ${filter.alias} | Name: ${filter.name} | Clause: ${filter.clause || "Empty"}`,
      )
      .join("\n");

    return {
      success: true,
      filterPresets: filterPresets,
      count: filterPresets.length,
      summary: `Retrieved ${filterPresets.length} filter presets:\n\n${filtersSummary}`,
      message: `Successfully retrieved ${filterPresets.length} filter presets`,
    };
  } catch (error) {
    sdk.console.error("Error listing filter presets:", error);
    return {
      success: false,
      error: `Failed to list filter presets: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve filter presets due to unexpected error",
    };
  }
};

export const create_filter_preset = async (sdk: SDK, input: any) => {
  try {
    const { alias, name, clause } = input;

    if (!alias || !name) {
      return {
        success: false,
        error: "Alias and name are required",
        summary: "Please provide both alias and name for the filter preset",
      };
    }

    // Use imported GraphQL mutation for creating filter preset
    const query = CREATE_FILTER_PRESET_MUTATION;

    const variables = {
      input: {
        alias: alias,
        name: name,
        clause: clause || "",
      },
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "createFilterPreset",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to create filter preset",
        summary: `Failed to create filter preset: ${name}`,
      };
    }

    const createResult = result.data.createFilterPreset;

    if (createResult.error) {
      return {
        success: false,
        error: `Creation failed with error code: ${createResult.error.code}`,
        summary: `Failed to create filter preset: ${createResult.error.code}`,
        details: createResult.error,
      };
    }

    const filter = createResult.filter;

    if (!filter) {
      return {
        success: false,
        error: "No filter returned after creation",
        summary: `Creation completed but no filter data returned for: ${name}`,
      };
    }

    const summary = `Successfully created filter preset:
  ID: ${filter.id}
  Alias: ${filter.alias}
  Name: ${filter.name}
  Clause: ${filter.clause || "Empty"}`;

    return {
      success: true,
      filter: filter,
      summary: summary,
      message: `Filter preset "${name}" created successfully`,
    };
  } catch (error) {
    sdk.console.error("Error creating filter preset:", error);
    return {
      success: false,
      error: `Failed to create filter preset: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to create filter preset due to unexpected error",
    };
  }
};

export const update_filter_preset = async (sdk: SDK, input: any) => {
  try {
    const { id, alias, name, clause } = input;

    if (!id) {
      return {
        success: false,
        error: "Filter ID is required",
        summary: "Please provide a filter ID to update",
      };
    }

    if (!alias && !name && clause === undefined) {
      return {
        success: false,
        error: "At least one field to update is required",
        summary: "Please provide alias, name, or clause to update",
      };
    }

    // Use imported GraphQL mutation for updating filter preset
    const query = UPDATE_FILTER_PRESET_MUTATION;

    const updateInput: any = {};
    if (alias !== undefined) updateInput.alias = alias;
    if (name !== undefined) updateInput.name = name;
    if (clause !== undefined) updateInput.clause = clause;

    const variables = {
      id: id,
      input: updateInput,
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "updateFilterPreset",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to update filter preset",
        summary: `Failed to update filter preset with ID: ${id}`,
      };
    }

    const updateResult = result.data.updateFilterPreset;

    if (updateResult.error) {
      return {
        success: false,
        error: `Update failed with error code: ${updateResult.error.code}`,
        summary: `Failed to update filter preset: ${updateResult.error.code}`,
        details: updateResult.error,
      };
    }

    const filter = updateResult.filter;

    if (!filter) {
      return {
        success: false,
        error: "No filter returned after update",
        summary: `Update completed but no filter data returned for ID: ${id}`,
      };
    }

    const summary = `Successfully updated filter preset:
  ID: ${filter.id}
  Alias: ${filter.alias}
  Name: ${filter.name}
  Clause: ${filter.clause || "Empty"}`;

    return {
      success: true,
      filter: filter,
      summary: summary,
      message: `Filter preset ${id} updated successfully`,
    };
  } catch (error) {
    sdk.console.error("Error updating filter preset:", error);
    return {
      success: false,
      error: `Failed to update filter preset: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to update filter preset due to unexpected error",
    };
  }
};

export const delete_filter_preset = async (sdk: SDK, input: any) => {
  try {
    const filterId = input.id;

    if (!filterId) {
      return {
        success: false,
        error: "Filter ID is required",
        summary: "Please provide a filter ID to delete",
      };
    }

    // Use imported GraphQL mutation for deleting filter preset
    const query = DELETE_FILTER_PRESET_MUTATION;

    const variables = {
      id: filterId,
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "deleteFilterPreset",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to delete filter preset",
        summary: `Failed to delete filter preset with ID: ${filterId}`,
      };
    }

    const deleteResult = result.data.deleteFilterPreset;
    const deletedId = deleteResult.deletedId;

    if (!deletedId) {
      return {
        success: false,
        error: "No filter was deleted",
        summary: `No filter preset was deleted. ID: ${filterId}`,
      };
    }

    const summary = `Successfully deleted filter preset:
  Deleted ID: ${deletedId}`;

    return {
      success: true,
      deletedId: deletedId,
      summary: summary,
      message: `Filter preset ${filterId} deleted successfully`,
    };
  } catch (error) {
    sdk.console.error("Error deleting filter preset:", error);
    return {
      success: false,
      error: `Failed to delete filter preset: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to delete filter preset due to unexpected error",
    };
  }
};
