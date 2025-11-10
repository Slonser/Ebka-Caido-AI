import type { SDK } from "caido:plugin";

import { executeGraphQLQueryviaSDK } from "../graphql";
import {
  DELETE_FINDINGS_MUTATION,
  FINDINGS_BY_OFFSET_QUERY,
  GET_FINDING_BY_ID_QUERY,
  UPDATE_FINDING_MUTATION,
} from "../graphql/queries";

export const update_finding = async (sdk: SDK, input: any) => {
  try {
    const findingId = input.id;
    const updateData = input.input;

    if (!findingId) {
      return {
        success: false,
        error: "Finding ID is required",
        summary: "Please provide a finding ID to update",
      };
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return {
        success: false,
        error: "Update data is required",
        summary: "Please provide data to update the finding",
      };
    }

    // Use imported GraphQL mutation for updating finding
    const query = UPDATE_FINDING_MUTATION;

    const variables = {
      id: findingId,
      input: updateData,
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "updateFinding",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to update finding",
        summary: `Failed to update finding with ID: ${findingId}`,
      };
    }

    const updateResult = result.data.updateFinding;

    if (updateResult.error) {
      return {
        success: false,
        error: `Update failed with error code: ${updateResult.error.code}`,
        summary: `Failed to update finding: ${updateResult.error.code}`,
      };
    }

    const updatedFinding = updateResult.finding;

    if (!updatedFinding) {
      return {
        success: false,
        error: "No finding returned after update",
        summary: `Update completed but no finding data returned for ID: ${findingId}`,
      };
    }

    const findingSummary = `Successfully updated finding:
  ID: ${updatedFinding.id}
  Reporter: ${updatedFinding.reporter}
  Title: ${updatedFinding.title}
  Host: ${updatedFinding.host}
  Path: ${updatedFinding.path}
  Created: ${updatedFinding.createdAt}
  Request ID: ${updatedFinding.request?.id || "N/A"}`;

    return {
      success: true,
      finding: updatedFinding,
      summary: findingSummary,
      message: `Finding ${findingId} updated successfully`,
    };
  } catch (error) {
    sdk.console.error("Error updating finding:", error);
    return {
      success: false,
      error: `Failed to update finding: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to update finding due to unexpected error",
    };
  }
};

export const delete_findings = async (sdk: SDK, input: any) => {
  try {
    const findingIds = input.ids;

    if (!findingIds || !Array.isArray(findingIds) || findingIds.length === 0) {
      return {
        success: false,
        error: "Finding IDs array is required",
        summary: "Please provide an array of finding IDs to delete",
      };
    }

    // Use imported GraphQL mutation for deleting findings
    const query = DELETE_FINDINGS_MUTATION;

    const variables = {
      input: {
        ids: findingIds,
      },
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "deleteFindings",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to delete findings",
        summary: `Failed to delete findings: ${findingIds.join(", ")}`,
      };
    }

    const deleteResult = result.data.deleteFindings;
    const deletedIds = deleteResult.deletedIds || [];

    if (deletedIds.length === 0) {
      return {
        success: false,
        error: "No findings were deleted",
        summary: `No findings were deleted. IDs: ${findingIds.join(", ")}`,
      };
    }

    const summary = `Successfully deleted ${deletedIds.length} finding(s):
  Deleted IDs: ${deletedIds.join(", ")}
  
  Requested IDs: ${findingIds.join(", ")}
  ${findingIds.length !== deletedIds.length ? `Note: ${findingIds.length - deletedIds.length} ID(s) were not found or could not be deleted` : ""}`;

    return {
      success: true,
      deletedIds: deletedIds,
      requestedIds: findingIds,
      count: deletedIds.length,
      summary: summary,
      message: `Successfully deleted ${deletedIds.length} finding(s)`,
    };
  } catch (error) {
    sdk.console.error("Error deleting findings:", error);
    return {
      success: false,
      error: `Failed to delete findings: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to delete findings due to unexpected error",
    };
  }
};

export const list_findings = async (sdk: SDK, input: any) => {
  try {
    const limit = input.limit || 50;
    const offset = input.offset || 0;

    // Use imported GraphQL query for listing findings with pagination
    const query = FINDINGS_BY_OFFSET_QUERY;

    const variables = {
      filter: input.filter || {},
      limit: limit,
      offset: offset,
      order: input.order || { by: "ID", ordering: "DESC" },
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "getFindingsByOffset",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch findings",
        summary: "Failed to retrieve findings from Caido",
      };
    }

    const findings = result.data.findingsByOffset.edges.map((edge: any) => ({
      id: edge.node.id,
      reporter: edge.node.reporter,
      title: edge.node.title,
      host: edge.node.host,
      path: edge.node.path,
      createdAt: edge.node.createdAt,
      requestId: edge.node.request?.id || "N/A",
    }));
    const pageInfo = result.data.findingsByOffset.pageInfo;

    const findingsSummary = findings
      .map(
        (finding: any) =>
          `ID: ${finding.id} | Reporter: ${finding.reporter} | Title: ${finding.title} | Host: ${finding.host} | Path: ${finding.path} | Created: ${finding.createdAt} | Request ID: ${finding.requestId}`,
      )
      .join("\n");

    return {
      success: true,
      findings: findings,
      count: findings.length,
      pageInfo: pageInfo,
      summary: `Retrieved ${findings.length} findings (offset: ${offset}, limit: ${limit}):\n\n${findingsSummary}`,
      totalAvailable: pageInfo.hasNextPage ? "More available" : "All retrieved",
    };
  } catch (error) {
    sdk.console.error("Error listing findings:", error);
    return {
      success: false,
      error: `Failed to list findings: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve findings due to unexpected error",
    };
  }
};

export const get_finding_by_id = async (sdk: SDK, input: any) => {
  try {
    const findingId = input.id;

    if (!findingId) {
      return {
        success: false,
        error: "Finding ID is required",
        summary: "Please provide a finding ID to retrieve",
      };
    }

    // Use imported GraphQL query for getting finding by ID
    const query = GET_FINDING_BY_ID_QUERY;

    const variables = {
      id: findingId,
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query,
      variables,
      operationName: "getFindingById",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch finding",
        summary: `Failed to retrieve finding with ID: ${findingId}`,
      };
    }

    const finding = result.data.finding;

    if (!finding) {
      return {
        success: false,
        error: "Finding not found",
        summary: `No finding found with ID: ${findingId}`,
      };
    }

    const findingSummary = `ID: ${finding.id}
  Reporter: ${finding.reporter}
  Title: ${finding.title}
  Host: ${finding.host}
  Path: ${finding.path}
  Created: ${finding.createdAt}
  Request ID: ${finding.request?.id || "N/A"}
  Description: ${finding.description}
  
  Request Body:
  ${finding.request?.raw || "N/A"}
  
  Response Body:
  ${finding.request?.response?.raw || "N/A"}`;

    return {
      success: true,
      finding: {
        id: finding.id,
        reporter: finding.reporter,
        title: finding.title,
        host: finding.host,
        path: finding.path,
        createdAt: finding.createdAt,
        requestId: finding.request?.id || "N/A",
        description: finding.description,
        requestBody: finding.request?.raw || "N/A",
        responseBody: finding.request?.response?.raw || "N/A",
      },
      summary: findingSummary,
      details: {
        id: finding.id,
        title: finding.title,
        description: finding.description,
        reporter: finding.reporter,
        host: finding.host,
        path: finding.path,
        createdAt: finding.createdAt,
        requestId: finding.request?.id || "N/A",
        requestBody: finding.request?.raw || "N/A",
        responseBody: finding.request?.response?.raw || "N/A",
      },
    };
  } catch (error) {
    sdk.console.error("Error getting finding by ID:", error);
    return {
      success: false,
      error: `Failed to get finding: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve finding due to unexpected error",
    };
  }
};

export const create_findings_from_requests = async (sdk: SDK, input: any) => {
  try {
    const title = input.title;
    const description = input.description;
    const reporter = input.reporter || "Ebka AI Assistant";
    const requestId = input.request_id;
    const severity = input.severity || "medium";
    const tags = input.tags || [];

    sdk.console.log(`Creating finding: "${title}" for request ${requestId}...`);

    // Validate required inputs
    if (!title.trim()) {
      return {
        error: "Title cannot be empty",
        summary: "Invalid finding title",
      };
    }

    if (!description.trim()) {
      return {
        error: "Description cannot be empty",
        summary: "Invalid finding description",
      };
    }

    if (!requestId) {
      return {
        error: "Request ID is required",
        summary: "Missing request ID",
      };
    }

    // Validate severity level
    const validSeverities = ["low", "medium", "high", "critical"];
    if (!validSeverities.includes(severity.toLowerCase())) {
      return {
        error: `Invalid severity level. Must be one of: ${validSeverities.join(", ")}`,
        summary: "Invalid severity level",
      };
    }

    // Get the request to associate with the finding
    let request = null;
    try {
      request = await sdk.requests.get(requestId);
      if (!request) {
        return {
          error: `No request found with ID: ${requestId}`,
          summary: "Request not found",
        };
      }
      sdk.console.log(`Found request: ${requestId}`);
    } catch (error) {
      sdk.console.error(`Error getting request ${requestId}: ${error}`);
      return {
        error: `Failed to get request ${requestId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        summary: "Failed to retrieve request",
      };
    }

    // Create the finding
    try {
      const finding = await sdk.findings.create({
        title: title,
        description: description,
        reporter: reporter,
        request: request.request,
      });

      sdk.console.log(
        `Successfully created finding with ID: ${finding.getId()}`,
      );

      return {
        success: true,
        finding_id: finding.getId(),
        title: title,
        description: description,
        reporter: reporter,
        request_id: requestId,
        severity: severity,
        tags: tags,
        finding_details: {
          id: finding.getId(),
          title: finding.getTitle(),
          description: finding.getDescription(),
          reporter: finding.getReporter(),
        },
        summary: `Finding "${title}" successfully created with ID ${finding.getId()}`,
      };
    } catch (error) {
      sdk.console.error(`Error creating finding: ${error}`);
      return {
        error: `Failed to create finding: ${error instanceof Error ? error.message : "Unknown error"}`,
        summary: "Failed to create finding",
      };
    }
  } catch (error) {
    sdk.console.error("Error in create_findings_from_requests:", error);
    return {
      error: `Failed to create finding: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to create finding",
    };
  }
};
