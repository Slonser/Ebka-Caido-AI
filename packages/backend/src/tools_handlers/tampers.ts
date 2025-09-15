import type { SDK } from "caido:plugin";

import { executeGraphQLQueryviaSDK } from "../graphql";
import {
  CREATE_TAMPER_RULE,
  CREATE_TAMPER_RULE_COLLECTION,
  getCollectionFragments,
  getReadRuleFragments,
  getRuleFragments,
  LIST_TAMPER_RULE_COLLECTIONS,
  READ_TAMPER_RULE,
  UPDATE_TAMPER_RULE,
} from "../graphql/queries";

export const create_tamper_rule_collection = async (sdk: SDK, input: any) => {
  try {
    const name = input.name;

    if (!name || typeof name !== "string") {
      return {
        success: false,
        error: "Collection name is required and must be a string",
      };
    }

    sdk.console.log(`Creating tamper rule collection: ${name}`);

    // This mutation uses named fragments, so we need to include them
    const mutation =
      CREATE_TAMPER_RULE_COLLECTION + "\n" + getCollectionFragments();

    const variables = { input: { name: name } };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: mutation,
      variables: variables,
      operationName: "createTamperRuleCollection",
    }) as any;

    if (result.data && result.data.createTamperRuleCollection) {
      const collection = result.data.createTamperRuleCollection.collection;

      sdk.console.log(
        `Successfully created tamper rule collection: ${collection.name} (ID: ${collection.id})`,
      );

      let summary = `Tamper rule collection created successfully:\n`;
      summary += `\n📁 Collection Details:`;
      summary += `\n  - ID: ${collection.id}`;
      summary += `\n  - Name: "${collection.name}"`;
      summary += `\n  - Status: Active`;
      summary += `\n  - Rules Count: ${collection.rules ? collection.rules.length : 0}`;
      summary += `\n  - Type: Tamper Rule Collection`;

      return {
        success: true,
        collection_id: collection.id,
        collection_name: collection.name,
        rules_count: collection.rules ? collection.rules.length : 0,
        summary: summary,
      };
    } else {
      sdk.console.error(
        "GraphQL response did not contain expected data:",
        result,
      );
      return {
        success: false,
        error: "GraphQL response did not contain expected data",
        response: result,
      };
    }
  } catch (error) {
    sdk.console.error("Error creating tamper rule collection:", error);
    return {
      success: false,
      error: `Failed to create tamper rule collection: ${error}`,
      details: error instanceof Error ? error.message : String(error),
    };
  }
};

export const create_tamper_rule = async (sdk: SDK, input: any) => {
  try {
    const collectionId = input.collection_id;
    const name = input.name;
    const section = input.section;
    const condition = input.condition;

    // Validate required inputs
    if (!collectionId || typeof collectionId !== "string") {
      return {
        success: false,
        error: "Collection ID is required and must be a string",
      };
    }

    if (!name || typeof name !== "string") {
      return {
        success: false,
        error: "Rule name is required and must be a string",
      };
    }

    if (!section || typeof section !== "object") {
      return {
        success: false,
        error: "Section configuration is required and must be an object",
      };
    }

    sdk.console.log(
      `Creating tamper rule "${name}" in collection ${collectionId}...`,
    );

    // This mutation uses named fragments including error handling, so we need to include them
    const mutation = CREATE_TAMPER_RULE + "\n" + getRuleFragments();

    const variables = {
      input: {
        collectionId: collectionId,
        name: name,
        section: section,
        ...(condition && { condition: condition }),
      },
    };

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: mutation,
      variables: variables,
      operationName: "createTamperRule",
    });

    if (result.data && result.data.createTamperRule) {
      const response = result.data.createTamperRule;

      // Check for errors
      if (response.error) {
        sdk.console.error("Error creating tamper rule:", response.error);
        return {
          success: false,
          error: `Failed to create tamper rule: ${response.error.code || "Unknown error"}`,
          error_details: response.error,
          summary: `Tamper rule creation failed: ${response.error.code || "Unknown error"}`,
        };
      }

      // Check for successful rule creation
      if (response.rule) {
        const rule = response.rule;
        sdk.console.log(
          `Successfully created tamper rule: ${rule.name} (ID: ${rule.id})`,
        );

        let summary = `Tamper rule created successfully:\n`;
        summary += `\n🔧 Rule Details:`;
        summary += `\n  - ID: ${rule.id}`;
        summary += `\n  - Name: "${rule.name}"`;
        summary += `\n  - Collection ID: ${rule.collection?.id || collectionId}`;
        summary += `\n  - Section Type: ${Object.keys(section)[0] || "unknown"}`;
        if (rule.condition) {
          summary += `\n  - Condition: ${rule.condition}`;
        }
        summary += `\n  - Status: Active`;

        return {
          success: true,
          rule_id: rule.id,
          rule_name: rule.name,
          collection_id: rule.collection?.id || collectionId,
          section_type: Object.keys(section)[0] || "unknown",
          condition: rule.condition,
          summary: summary,
        };
      } else {
        sdk.console.error("No rule data returned from GraphQL mutation");
        return {
          success: false,
          error: "No rule data returned from GraphQL mutation",
          response: response,
          summary: "Tamper rule creation failed - no rule data returned",
        };
      }
    } else {
      sdk.console.error(
        "GraphQL response did not contain expected data:",
        result,
      );
      return {
        success: false,
        error: "GraphQL response did not contain expected data",
        response: result,
        summary: "Tamper rule creation failed - invalid GraphQL response",
      };
    }
  } catch (error) {
    sdk.console.error("Error creating tamper rule:", error);
    return {
      success: false,
      error: `Failed to create tamper rule: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Tamper rule creation failed due to unexpected error",
    };
  }
};

export const update_tamper_rule = async (sdk: SDK, input: any) => {
  try {
    const ruleId = input.rule_id;
    const name = input.name;
    const section = input.section;
    const condition = input.condition;

    // Validate required inputs
    if (!ruleId || typeof ruleId !== "string") {
      return {
        success: false,
        error: "Rule ID is required and must be a string",
      };
    }

    // At least one field should be provided for update
    if (!name && !section && !condition) {
      return {
        success: false,
        error:
          "At least one field (name, section, or condition) must be provided for update",
      };
    }

    sdk.console.log(`Updating tamper rule ${ruleId}...`);

    // This mutation uses named fragments including error handling, so we need to include them
    const mutation = UPDATE_TAMPER_RULE + "\n" + getRuleFragments();

    // Build update input object with only provided fields
    const updateInput: any = {};
    if (name) updateInput.name = name;
    if (section) updateInput.section = section;
    if (condition !== undefined) updateInput.condition = condition;

    const variables = {
      id: ruleId,
      input: updateInput,
    };

    sdk.console.log(`Update input:`, JSON.stringify(updateInput, null, 2));

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: mutation,
      variables: variables,
      operationName: "updateTamperRule",
    });

    if (result.data && result.data.updateTamperRule) {
      const response = result.data.updateTamperRule;

      // Check for errors
      if (response.error) {
        sdk.console.error("Error updating tamper rule:", response.error);
        return {
          success: false,
          error: `Failed to update tamper rule: ${JSON.stringify(response.error) || "Unknown error"}`,
          error_details: response.error,
          summary: `Tamper rule update failed: ${JSON.stringify(response.error) || "Unknown error"}`,
        };
      }

      // Check for successful rule update
      if (response.rule) {
        const rule = response.rule;
        sdk.console.log(
          `Successfully updated tamper rule: ${rule.name} (ID: ${rule.id})`,
        );

        let summary = `Tamper rule updated successfully:\n`;
        summary += `\n🔧 Rule Details:`;
        summary += `\n  - ID: ${rule.id}`;
        summary += `\n  - Name: "${rule.name}"`;
        summary += `\n  - Collection ID: ${rule.collection?.id || "unknown"}`;
        summary += `\n  - Section Type: ${rule.section ? Object.keys(rule.section)[0] || "unknown" : "unknown"}`;
        if (rule.condition) {
          summary += `\n  - Condition: ${rule.condition}`;
        }
        summary += `\n  - Updated Fields: ${Object.keys(updateInput).join(", ")}`;
        summary += `\n  - Status: Active`;

        return {
          success: true,
          rule_id: rule.id,
          rule_name: rule.name,
          collection_id: rule.collection?.id,
          section_type: rule.section
            ? Object.keys(rule.section)[0] || "unknown"
            : "unknown",
          condition: rule.condition,
          updated_fields: Object.keys(updateInput),
          summary: summary,
        };
      } else {
        sdk.console.error("No rule data returned from GraphQL mutation");
        return {
          success: false,
          error: "No rule data returned from GraphQL mutation",
          response: response,
          summary: "Tamper rule update failed - no rule data returned",
        };
      }
    } else {
      sdk.console.error(
        "GraphQL response did not contain expected data:",
        result,
      );
      return {
        success: false,
        error: "GraphQL response did not contain expected data",
        response: result,
        summary: "Tamper rule update failed - invalid GraphQL response",
      };
    }
  } catch (error) {
    sdk.console.error("Error updating tamper rule:", error);
    return {
      success: false,
      error: `Failed to update tamper rule: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Tamper rule update failed due to unexpected error",
    };
  }
};

export const list_tamper_rule_collections = async (sdk: SDK, input: any) => {
  try {
    const collectionId = input.collection_id;

    sdk.console.log(
      `Listing tamper rule collections${collectionId ? ` for ID: ${collectionId}` : ""}...`,
    );

    // Use a comprehensive GraphQL query to get matcher and replacer information
    // This query uses inline fragments, so no additional fragments are needed
    const query = LIST_TAMPER_RULE_COLLECTIONS;

    const variables = {};

    sdk.console.log(
      "Executing GraphQL query with variables:",
      JSON.stringify(variables, null, 2),
    );
    sdk.console.log("GraphQL query:", query.substring(0, 200) + "...");

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: query,
      variables: variables,
      operationName: "tamperRuleCollections",
    });

    if (result.data && result.data.tamperRuleCollections) {
      const collections = result.data.tamperRuleCollections;

      // Filter by collection ID if specified
      let targetCollections = collections;
      if (collectionId) {
        targetCollections = collections.filter(
          (collection: any) => collection.id === collectionId,
        );
      }

      const collectionsData = targetCollections.map((collection: any) => ({
        id: collection.id,
        name: collection.name,
        rules_count: collection.rules ? collection.rules.length : 0,
        rules: collection.rules
          ? collection.rules.map((rule: any) => {
              // Extract matcher and replacer information
              let matcherInfo = null;
              let replacerInfo = null;

              if (rule.section) {
                const sectionType = Object.keys(rule.section)[0];
                // @ts-ignore
                const sectionData = rule.section[sectionType];

                if (sectionData && sectionData.operation) {
                  const operation = sectionData.operation;
                  const operationType = Object.keys(operation)[0];
                  const operationData = operation[operationType];

                  if (operationData) {
                    // Extract matcher info
                    if (operationData.matcher) {
                      matcherInfo = {
                        has_matcher: true,
                        matcher_data: operationData.matcher,
                      };
                    }

                    // Extract replacer info
                    if (operationData.replacer) {
                      replacerInfo = {
                        has_replacer: true,
                        replacer_data: operationData.replacer,
                      };
                    }
                  }
                }
              }

              return {
                id: rule.id,
                name: rule.name,
                section_type: rule.section
                  ? Object.keys(rule.section)[0] || "unknown"
                  : "unknown",
                matcher: matcherInfo,
                replacer: replacerInfo,
                condition: rule.condition,
                enabled: rule.enable ? rule.enable.rank > 0 : false,
                enable_rank: rule.enable ? rule.enable.rank : 0,
                collection_id: rule.collection?.id,
                collection_name: rule.collection?.name,
              };
            })
          : [],
      }));

      sdk.console.log(
        `Found ${collectionsData.length} tamper rule collection(s)`,
      );

      // Create detailed summary with all rule information
      let summary = `Found ${collectionsData.length} tamper rule collection(s)${collectionId ? ` matching ID: ${collectionId}` : ""}`;

      if (collectionsData.length > 0) {
        summary += `:\n`;
        collectionsData.forEach((collection: any) => {
          summary += `\n📁 Collection: "${collection.name}" (ID: ${collection.id}) - ${collection.rules_count} rules`;
          if (collection.rules && collection.rules.length > 0) {
            collection.rules.forEach((rule: any) => {
              summary += `\n  🔧 Rule: "${rule.name}" (ID: ${rule.id})`;
              summary += `\n    - Section: ${rule.section_type}`;
              summary += `\n    - Enabled: ${rule.enabled ? "Yes" : "No"}`;
              summary += `\n    - Priority: ${rule.enable_rank}`;
              if (rule.condition) {
                summary += `\n    - Condition: ${rule.condition}`;
              }
              if (rule.matcher) {
                summary += `\n    - Matcher: ${rule.matcher.type || "unknown"}`;
                if (rule.matcher.data) {
                  if (
                    rule.matcher.type === "value" &&
                    rule.matcher.data.value
                  ) {
                    summary += ` (Value: "${rule.matcher.data.value}")`;
                  } else if (
                    rule.matcher.type === "regex" &&
                    rule.matcher.data.regex
                  ) {
                    summary += ` (Regex: "${rule.matcher.data.regex}")`;
                  } else if (
                    rule.matcher.type === "name" &&
                    rule.matcher.data.name
                  ) {
                    summary += ` (Name: "${rule.matcher.data.name}")`;
                  }
                }
              }
              if (rule.replacer) {
                summary += `\n    - Replacer: ${rule.replacer.type || "unknown"}`;
                if (rule.replacer.data) {
                  if (
                    rule.replacer.type === "term" &&
                    rule.replacer.data.term
                  ) {
                    summary += ` (Term: "${rule.replacer.data.term}")`;
                  } else if (
                    rule.replacer.type === "workflow" &&
                    rule.replacer.data.id
                  ) {
                    summary += ` (Workflow ID: "${rule.replacer.data.id}")`;
                  }
                }
              }
            });
          }
        });
      }

      return {
        success: true,
        total_collections: collectionsData.length,
        collections: collectionsData,
        summary: summary,
      };
    } else {
      sdk.console.error(
        "GraphQL response did not contain expected data:",
        result,
      );
      sdk.console.error("Full result object:", JSON.stringify(result, null, 2));
      return {
        success: false,
        error: "GraphQL response did not contain expected data",
        response: result,
        summary:
          "Failed to retrieve tamper rule collections - invalid GraphQL response",
      };
    }
  } catch (error) {
    sdk.console.error("Error listing tamper rule collections:", error);
    return {
      success: false,
      error: `Failed to list tamper rule collections: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to list tamper rule collections due to unexpected error",
    };
  }
};

export const list_tamper_rules = async (sdk: SDK, input: any) => {
  try {
    const collectionId = input.collection_id;
    const ruleId = input.rule_id;

    sdk.console.log(
      `Listing tamper rules${collectionId ? ` from collection: ${collectionId}` : ""}${ruleId ? ` for rule: ${ruleId}` : ""}...`,
    );

    // If specific rule ID is provided, use read_tamper_rule instead
    if (ruleId) {
      return await read_tamper_rule(sdk, { rule_id: ruleId });
    }

    // Use a comprehensive GraphQL query to get matcher and replacer information
    // This query uses inline fragments, so no additional fragments are needed
    const query = LIST_TAMPER_RULE_COLLECTIONS;

    const variables = {};

    sdk.console.log(
      "Executing GraphQL query with variables:",
      JSON.stringify(variables, null, 2),
    );
    sdk.console.log("GraphQL query:", query.substring(0, 200) + "...");

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: query,
      variables: variables,
      operationName: "tamperRuleCollections",
    });

    if (result.data && result.data.tamperRuleCollections) {
      const collections = result.data.tamperRuleCollections;

      // Filter by collection ID if specified
      let targetCollections = collections;
      if (collectionId) {
        targetCollections = collections.filter(
          (collection: any) => collection.id === collectionId,
        );
      }

      const allRules: any[] = [];
      const collectionsData = targetCollections.map((collection: any) => {
        const rules = collection.rules
          ? collection.rules.map((rule: any) => {
              // Extract matcher and replacer information
              let matcherInfo = null;
              let replacerInfo = null;

              if (rule.section) {
                const sectionType = Object.keys(rule.section)[0];
                // @ts-ignore
                const sectionData = rule.section[sectionType];

                if (sectionData && sectionData.operation) {
                  const operation = sectionData.operation;
                  const operationType = Object.keys(operation)[0];
                  const operationData = operation[operationType];

                  if (operationData) {
                    // Extract matcher info
                    if (operationData.matcher) {
                      matcherInfo = {
                        has_matcher: true,
                        matcher_data: operationData.matcher,
                      };
                    }

                    // Extract replacer info
                    if (operationData.replacer) {
                      replacerInfo = {
                        has_replacer: true,
                        replacer_data: operationData.replacer,
                      };
                    }
                  }
                }
              }

              return {
                id: rule.id,
                name: rule.name,
                collection_id: collection.id,
                collection_name: collection.name,
                section_type: rule.section
                  ? Object.keys(rule.section)[0] || "unknown"
                  : "unknown",
                matcher: matcherInfo,
                replacer: replacerInfo,
                condition: rule.condition,
                enabled: rule.enable ? rule.enable.rank > 0 : false,
                enable_rank: rule.enable ? rule.enable.rank : 0,
              };
            })
          : [];

        allRules.push(...rules);

        return {
          id: collection.id,
          name: collection.name,
          rules_count: rules.length,
          rules: rules,
        };
      });

      sdk.console.log(
        `Found ${allRules.length} tamper rule(s) across ${collectionsData.length} collection(s)`,
      );

      // Create detailed summary with all rule information
      let summary = `Found ${allRules.length} tamper rule(s) across ${collectionsData.length} collection(s)${collectionId ? ` in collection: ${collectionId}` : ""}`;

      if (collectionsData.length > 0) {
        summary += `:\n`;
        collectionsData.forEach((collection: any) => {
          summary += `\n📁 Collection: "${collection.name}" (ID: ${collection.id}) - ${collection.rules.length} rules`;
          if (collection.rules && collection.rules.length > 0) {
            collection.rules.forEach((rule: any) => {
              summary += `\n  🔧 Rule: "${rule.name}" (ID: ${rule.id})`;
              summary += `\n    - Section: ${rule.section_type}`;
              summary += `\n    - Enabled: ${rule.enabled ? "Yes" : "No"}`;
              summary += `\n    - Priority: ${rule.enable_rank}`;
              if (rule.condition) {
                summary += `\n    - Condition: ${rule.condition}`;
              }
              if (rule.matcher) {
                summary += `\n    - Matcher: ${rule.matcher.type || "unknown"}`;
                if (rule.matcher.data) {
                  if (
                    rule.matcher.type === "value" &&
                    rule.matcher.data.value
                  ) {
                    summary += ` (Value: "${rule.matcher.data.value}")`;
                  } else if (
                    rule.matcher.type === "regex" &&
                    rule.matcher.data.regex
                  ) {
                    summary += ` (Regex: "${rule.matcher.data.regex}")`;
                  } else if (
                    rule.matcher.type === "name" &&
                    rule.matcher.data.name
                  ) {
                    summary += ` (Name: "${rule.matcher.data.name}")`;
                  }
                }
              }
              if (rule.replacer) {
                summary += `\n    - Replacer: ${rule.replacer.type || "unknown"}`;
                if (rule.replacer.data) {
                  if (
                    rule.replacer.type === "term" &&
                    rule.replacer.data.term
                  ) {
                    summary += ` (Term: "${rule.replacer.data.term}")`;
                  } else if (
                    rule.replacer.type === "workflow" &&
                    rule.replacer.data.id
                  ) {
                    summary += ` (Workflow ID: "${rule.replacer.data.id}")`;
                  }
                }
              }
            });
          }
        });
      }

      return {
        success: true,
        total_collections: collectionsData.length,
        total_rules: allRules.length,
        collections: collectionsData,
        all_rules: allRules,
        summary: summary,
      };
    } else {
      sdk.console.error(
        "GraphQL response did not contain expected data:",
        result,
      );
      return {
        success: false,
        error: "GraphQL response did not contain expected data",
        response: result,
        summary: "Failed to retrieve tamper rules - invalid GraphQL response",
      };
    }
  } catch (error) {
    sdk.console.error("Error listing tamper rules:", error);
    return {
      success: false,
      error: `Failed to list tamper rules: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to list tamper rules due to unexpected error",
    };
  }
};

export const read_tamper_rule = async (sdk: SDK, input: any) => {
  try {
    const ruleId = input.rule_id;

    if (!ruleId || typeof ruleId !== "string") {
      return {
        success: false,
        error: "Rule ID is required and must be a string",
      };
    }

    sdk.console.log(`Reading tamper rule: ${ruleId}...`);

    // This query uses named fragments, so we need to include them
    const query = READ_TAMPER_RULE + "\n" + getReadRuleFragments();

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: query,
      variables: {},
      operationName: "tamperRuleCollections",
    });

    if (result.data && result.data.tamperRuleCollections) {
      const collections = result.data.tamperRuleCollections;

      // Find the specific rule across all collections
      let targetRule = null;
      let targetCollection = null;

      for (const collection of collections) {
        if (collection.rules) {
          const rule = collection.rules.find((r: any) => r.id === ruleId);
          if (rule) {
            targetRule = rule;
            targetCollection = collection;
            break;
          }
        }
      }

      if (targetRule && targetCollection) {
        sdk.console.log(
          `Found tamper rule: ${targetRule.name} (ID: ${targetRule.id}) in collection: ${targetCollection.name}`,
        );

        // Extract matcher and replacer information
        const matcherInfo = null;
        const replacerInfo = null;

        sdk.console.log(
          "Target rule section:",
          JSON.stringify(targetRule.section, null, 2),
        );
        // Create detailed summary with all rule information
        let summary = `Tamper rule "${targetRule.name}" found successfully:\n`;
        summary += `\n🔧 Rule Details:`;
        summary += `\n${JSON.stringify(targetRule, null, 2)}`;

        return {
          success: true,
          rule: {
            id: targetRule.id,
            name: targetRule.name,
            collection_id: targetCollection.id,
            collection_name: targetCollection.name,
            section_type: targetRule.section
              ? Object.keys(targetRule.section)[0] || "unknown"
              : "unknown",
            matcher: matcherInfo,
            replacer: replacerInfo,
            section_raw: targetRule.section,
            condition: targetRule.condition,
            enabled: targetRule.enable ? targetRule.enable.rank > 0 : false,
            enable_rank: targetRule.enable ? targetRule.enable.rank : 0,
          },
          summary: summary,
        };
      } else {
        sdk.console.error(`Tamper rule with ID ${ruleId} not found`);
        return {
          success: false,
          error: `Tamper rule with ID ${ruleId} not found`,
          rule_id: ruleId,
          summary: `Tamper rule with ID ${ruleId} not found in any collection`,
        };
      }
    } else {
      sdk.console.error(
        "GraphQL response did not contain expected data:",
        result,
      );
      return {
        success: false,
        error: "GraphQL response did not contain expected data",
        response: result,
        summary: "Failed to read tamper rule - invalid GraphQL response",
      };
    }
  } catch (error) {
    sdk.console.error("Error reading tamper rule:", error);
    return {
      success: false,
      error: `Failed to read tamper rule: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to read tamper rule due to unexpected error",
    };
  }
};
