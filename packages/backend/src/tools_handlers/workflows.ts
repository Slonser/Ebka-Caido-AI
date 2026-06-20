import type { SDK } from "caido:plugin";

import { executeGraphQLQueryviaSDK } from "../graphql";
import {
  CREATE_WORKFLOW_MUTATION,
  DELETE_WORKFLOW_MUTATION,
  GLOBALIZE_WORKFLOW_MUTATION,
  LOCALIZE_WORKFLOW_MUTATION,
  RENAME_WORKFLOW_MUTATION,
  RUN_ACTIVE_WORKFLOW_MUTATION,
  RUN_CONVERT_WORKFLOW_MUTATION,
  TEST_ACTIVE_WORKFLOW_MUTATION,
  TEST_CONVERT_WORKFLOW_MUTATION,
  TEST_PASSIVE_WORKFLOW_MUTATION,
  TOGGLE_WORKFLOW_MUTATION,
  UPDATE_WORKFLOW_MUTATION,
  WORKFLOW_NODE_DEFINITIONS_QUERY,
  WORKFLOW_QUERY,
  WORKFLOWS_QUERY,
} from "../graphql/queries";

const toBase64 = (value: string, alreadyBase64 = false) =>
  alreadyBase64 ? value : Buffer.from(value, "utf8").toString("base64");

const parseDefinition = (definition: any) => {
  if (typeof definition === "string") {
    return JSON.parse(definition);
  }
  return definition;
};

const workflowPayloadError = (payload: any, fallback: any) =>
  payload?.error || fallback || "Workflow operation failed";

const buildRawRequestInput = (input: any) => {
  const raw = input.request_raw;
  const rawBase64 = input.request_raw_base64;
  const connectionInfo = input.connection || {
    host: "localhost",
    port: 80,
    isTLS: false,
    SNI: null,
  };

  if (!raw && !rawBase64) {
    return null;
  }

  return {
    connectionInfo,
    raw: toBase64(rawBase64 || raw, !!rawBase64),
  };
};

const buildRawResponseInput = (input: any) => {
  const raw = input.response_raw;
  const rawBase64 = input.response_raw_base64;
  if (!raw && !rawBase64) {
    return null;
  }
  return {
    raw: toBase64(rawBase64 || raw, !!rawBase64),
  };
};

const templateId = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

export const list_workflows = async (sdk: SDK, input: any) => {
  try {
    const kind = input.kind;
    const enabled = input.enabled;
    const includeDefinition = input.include_definition === true;

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: WORKFLOWS_QUERY,
      variables: {},
      operationName: "workflows",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to list workflows",
        summary: "Failed to retrieve workflows from Caido",
      };
    }

    let workflows = result.data.workflows || [];
    if (kind) {
      workflows = workflows.filter(
        (workflow: any) =>
          String(workflow.kind).toLowerCase() === String(kind).toLowerCase(),
      );
    }
    if (typeof enabled === "boolean") {
      workflows = workflows.filter(
        (workflow: any) => workflow.enabled === enabled,
      );
    }
    if (!includeDefinition) {
      workflows = workflows.map(({ definition, ...workflow }: any) => ({
        ...workflow,
        hasDefinition: definition !== undefined && definition !== null,
      }));
    }

    const summary = workflows
      .map(
        (workflow: any) =>
          `ID: ${workflow.id} | ${workflow.name} | Kind: ${workflow.kind} | Enabled: ${workflow.enabled} | Global: ${workflow.global}`,
      )
      .join("\n");

    return {
      success: true,
      workflows,
      count: workflows.length,
      summary: `Retrieved ${workflows.length} workflow(s):\n\n${summary}`,
    };
  } catch (error) {
    sdk.console.error("Error listing workflows:", error);
    return {
      success: false,
      error: `Failed to list workflows: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve workflows due to unexpected error",
    };
  }
};

export const get_workflow = async (sdk: SDK, input: any) => {
  try {
    const id = input.id;
    if (!id) {
      return {
        success: false,
        error: "Workflow ID is required",
        summary: "Please provide a workflow ID",
      };
    }

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: WORKFLOW_QUERY,
      variables: { id },
      operationName: "workflow",
    });

    if (!result.success || !result.data?.workflow) {
      return {
        success: false,
        error: result.error || "Workflow not found",
        summary: `No workflow found with ID: ${id}`,
      };
    }

    const workflow = result.data.workflow;
    return {
      success: true,
      workflow,
      summary: `Workflow ${workflow.id}: ${workflow.name} (${workflow.kind}), enabled: ${workflow.enabled}`,
    };
  } catch (error) {
    sdk.console.error("Error getting workflow:", error);
    return {
      success: false,
      error: `Failed to get workflow: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve workflow due to unexpected error",
    };
  }
};

export const list_workflow_node_definitions = async (sdk: SDK, _input: any) => {
  try {
    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: WORKFLOW_NODE_DEFINITIONS_QUERY,
      variables: {},
      operationName: "workflowNodeDefinitions",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to list workflow node definitions",
        summary: "Failed to retrieve workflow node definitions from Caido",
      };
    }

    return {
      success: true,
      node_definitions: result.data.workflowNodeDefinitions,
      count: result.data.workflowNodeDefinitions.length,
      summary: `Retrieved ${result.data.workflowNodeDefinitions.length} workflow node definition(s)`,
    };
  } catch (error) {
    sdk.console.error("Error listing workflow node definitions:", error);
    return {
      success: false,
      error: `Failed to list workflow node definitions: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary:
        "Failed to retrieve workflow node definitions due to unexpected error",
    };
  }
};

const convertTemplate = (name: string, nodeDefinitionId = "caido/code-js") => ({
  edition: 2,
  id: templateId(),
  name,
  description: "",
  kind: "convert",
  graph: {
    nodes: [
      {
        id: 0,
        alias: "start",
        name: "Start",
        definition_id: "caido/convert-start",
        version: "^0.1.0",
        inputs: [],
        display: { x: 0, y: -150 },
      },
      {
        id: 1,
        alias: "end",
        name: "End",
        definition_id: "caido/convert-end",
        version: "^0.1.0",
        inputs: [
          {
            alias: "data",
            value: { kind: "ref", data: "$transform.data" },
          },
        ],
        display: { x: 0, y: 230 },
      },
      {
        id: 2,
        alias: "transform",
        name: "Transform",
        definition_id: nodeDefinitionId,
        version: nodeDefinitionId === "caido/code-js" ? "0.1.0" : "^0.1.0",
        inputs: [
          {
            alias: "data",
            value: { kind: "ref", data: "$start.data" },
          },
          ...(nodeDefinitionId === "caido/code-js"
            ? [
                {
                  alias: "code",
                  value: {
                    kind: "string",
                    data: `/**\n * @param {BytesInput} input\n * @param {SDK} sdk\n * @returns {MaybePromise<Data>}\n */\nexport function run(input, sdk) {\n  const text = sdk.asString(input);\n  return text;\n}\n`,
                  },
                },
              ]
            : []),
        ],
        display: { x: 0, y: 30 },
      },
    ],
    edges: [
      {
        source: { node_id: 0, exec_alias: "exec" },
        target: { node_id: 2, exec_alias: "exec" },
      },
      {
        source: { node_id: 2, exec_alias: "exec" },
        target: { node_id: 1, exec_alias: "exec" },
      },
    ],
  },
});

const activeTemplate = (name: string) => ({
  edition: 2,
  id: templateId(),
  name,
  description: "",
  kind: "active",
  graph: {
    nodes: [
      {
        id: 0,
        alias: "active_start",
        name: "Active Start",
        definition_id: "caido/active-start",
        version: "^0.1.0",
        inputs: [],
        display: { x: 0, y: 0 },
      },
      {
        id: 1,
        alias: "active_end",
        name: "Active End",
        definition_id: "caido/active-end",
        version: "^0.1.0",
        inputs: [],
        display: { x: 360, y: 0 },
      },
    ],
    edges: [
      {
        source: { node_id: 0, exec_alias: "exec" },
        target: { node_id: 1, exec_alias: "exec" },
      },
    ],
  },
});

const passiveTemplate = (name: string) => ({
  edition: 2,
  id: templateId(),
  name,
  description: "",
  kind: "passive",
  graph: {
    nodes: [
      {
        id: 0,
        alias: "on_intercept_request",
        name: "On intercept request",
        definition_id: "caido/on-intercept-request",
        version: "^0.1.0",
        inputs: [],
        display: { x: 0, y: -120 },
      },
      {
        id: 1,
        alias: "passive_end",
        name: "Passive End",
        definition_id: "caido/passive-end",
        version: "^0.1.0",
        inputs: [],
        display: { x: 0, y: 180 },
      },
    ],
    edges: [
      {
        source: { node_id: 0, exec_alias: "exec" },
        target: { node_id: 1, exec_alias: "exec" },
      },
    ],
  },
});

const authCaptureTemplate = (
  name: string,
  variableName = "SESSION_TOKEN",
  extractionCode = `const body = response?.getBody()?.toText() || "";\n  const match = body.match(/"token"\\s*:\\s*"([^"]+)"/);\n  const value = match?.[1];`,
) => {
  const variableNameLiteral = JSON.stringify(variableName);

  return {
    edition: 2,
    id: templateId(),
    name,
    description:
      "Passive workflow that extracts a token/captcha/session value and saves it to a Caido environment variable.",
    kind: "passive",
    graph: {
      nodes: [
        {
          id: 0,
          alias: "on_intercept_response",
          name: "On intercept response",
          definition_id: "caido/on-intercept-response",
          version: "^0.1.0",
          inputs: [],
          display: { x: 0, y: -160 },
        },
        {
          id: 1,
          alias: "save_env",
          name: "Save Environment Variable",
          definition_id: "caido/http-code-js",
          version: "0.1.1",
          inputs: [
            {
              alias: "request",
              value: { kind: "ref", data: "$on_intercept_response.request" },
            },
            {
              alias: "response",
              value: { kind: "ref", data: "$on_intercept_response.response" },
            },
            {
              alias: "code",
              value: {
                kind: "string",
                data: `/**\n * @param {NodeInputHTTP} input\n * @param {SDK} sdk\n * @returns {MaybePromise<NodeResult | Data | undefined>}\n */\nexport async function run({ request, response, extra }, sdk) {\n  const variableName = ${variableNameLiteral};\n  ${extractionCode}\n\n  if (!value) {\n    sdk.console.log("No value matched for " + variableName + ".");\n    return { data: null, extra };\n  }\n\n  await sdk.env.setVar({\n    name: variableName,\n    value,\n    secret: true,\n    global: true\n  });\n\n  sdk.console.log("Saved " + variableName + " to the Global environment.");\n  return { data: null, extra };\n}\n`,
              },
            },
          ],
          display: { x: 0, y: 20 },
        },
        {
          id: 2,
          alias: "passive_end",
          name: "Passive End",
          definition_id: "caido/passive-end",
          version: "^0.1.0",
          inputs: [],
          display: { x: 0, y: 220 },
        },
      ],
      edges: [
        {
          source: { node_id: 0, exec_alias: "exec" },
          target: { node_id: 1, exec_alias: "exec" },
        },
        {
          source: { node_id: 1, exec_alias: "exec" },
          target: { node_id: 2, exec_alias: "exec" },
        },
      ],
    },
  };
};

const authExtractionCode = (input: any) => {
  if (input.extraction_code) {
    return input.extraction_code;
  }

  return `const body = response?.getBody()?.toText() || "";\n  const match = body.match(/"token"\\s*:\\s*"([^"]+)"/);\n  const value = match?.[1];`;
};

export const get_workflow_definition_guide = async (sdk: SDK, input: any) => {
  try {
    const kind = String(input.kind || "").toLowerCase();
    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: WORKFLOW_NODE_DEFINITIONS_QUERY,
      variables: {},
      operationName: "workflowNodeDefinitions",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to load workflow node definitions",
        summary: "Failed to retrieve workflow definition guide",
      };
    }

    const nodes = result.data.workflowNodeDefinitions
      .map((node: any) => node.raw)
      .filter((node: any) => !kind || node.workflows?.includes(kind));

    return {
      success: true,
      definition_shape: {
        edition: 2,
        id: "uuid string",
        name: "workflow name",
        description: "optional description",
        kind: "convert | active | passive",
        graph: {
          nodes:
            "Array of nodes with id, alias, name, definition_id, version, inputs, display",
          edges:
            "Array of exec edges: { source:{node_id,exec_alias}, target:{node_id,exec_alias} }",
        },
      },
      value_shapes: {
        literal_string: { kind: "string", data: "value" },
        reference: {
          kind: "ref",
          data: "$node_alias.output_alias",
        },
      },
      workflow_kind_notes: {
        convert:
          "Use caido/convert-start and caido/convert-end. End node input data should reference the final transform node output. Convert workflows can be used in Tamper replacers and Replay preprocessors.",
        active:
          "Use caido/active-start and caido/active-end. Active workflows are run manually against a request ID.",
        passive:
          "Use an event start such as caido/on-intercept-request and caido/passive-end. Passive workflows are usually enabled and react to traffic.",
      },
      javascript_node_examples: {
        http_message_api_context: {
          applies_to: "caido/http-code-js",
          notes: [
            "The run signature is run({ request, response, extra }, sdk).",
            "request and response expose getBody()?.toText() for body text.",
            "request.getQuery() returns the request query string.",
            "getHeader(name) returns an array of matching header values in current Caido builds; use the first value or join the array before parsing.",
            "Use sdk.env.setVar({ name, value, secret, global }) to save values and sdk.env.getVar(name) to read them.",
            "For AUTH_CAPTURE extraction_code, define const value or let value; the surrounding template saves value into the requested environment variable.",
          ],
          examples: {
            cookie_from_request: `const cookieHeaderValue = request?.getHeader("Cookie") || [];\nconst cookieHeader = Array.isArray(cookieHeaderValue) ? cookieHeaderValue.join("; ") : cookieHeaderValue;\nconst cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith("PHPSESSID="));\nconst value = cookie ? cookie.slice(cookie.indexOf("=") + 1) : undefined;`,
            header_from_response: `const headerValue = response?.getHeader("X-Captcha") || [];\nconst value = Array.isArray(headerValue) ? headerValue[0] : headerValue;`,
            query_from_request: `const query = request?.getQuery() || "";\nconst params = query.replace(/^\\?/, "").split("&").filter(Boolean);\nconst pair = params.find((part) => decodeURIComponent((part.split("=")[0] || "").replace(/\\+/g, " ")) === "captcha");\nconst value = pair ? decodeURIComponent(pair.slice(pair.indexOf("=") + 1).replace(/\\+/g, " ")) : undefined;`,
            body_regex_from_response: `const body = response?.getBody()?.toText() || "";\nconst match = body.match(/"token"\\s*:\\s*"([^"]+)"/);\nconst value = match?.[1];`,
          },
        },
        convert_caido_code_js_v0_1_0: {
          node_definition_id: "caido/code-js",
          version: "0.1.0",
          required_inputs: ["data", "code"],
          code: `/**\n * @param {BytesInput} input\n * @param {SDK} sdk\n * @returns {MaybePromise<Data>}\n */\nexport function run(input, sdk) {\n  const text = sdk.asString(input);\n  return text;\n}\n`,
          notes:
            "For CONVERT workflows using caido/code-js version 0.1.0, pass bytes via the data input and write run(input, sdk). Return a string/bytes-compatible Data value.",
        },
        passive_save_environment_variable: {
          node_definition_id: "caido/http-code-js",
          version: "0.1.1",
          required_inputs: ["request", "response", "code"],
          code: `/**\n * @param {NodeInputHTTP} input\n * @param {SDK} sdk\n * @returns {MaybePromise<NodeResult | Data | undefined>}\n */\nexport async function run({ request, response, extra }, sdk) {\n  const body = response?.getBody()?.toText() || "";\n  const match = body.match(/"token"\\s*:\\s*"([^"]+)"/);\n  if (match?.[1]) {\n    await sdk.env.setVar({ name: "SESSION_TOKEN", value: match[1], secret: true, global: true });\n  }\n  return { data: null, extra };\n}\n`,
          notes:
            "Use sdk.env.setVar in PASSIVE/ACTIVE JavaScript workflows to save session, captcha, CSRF, or JWT values. In Replay, insert it with an environment preprocessor placeholder using options.environment.variableName.",
        },
      },
      node_definitions: nodes.map((node: any) => ({
        id: node.id,
        name: node.name,
        version: node.version,
        workflows: node.workflows,
        kind: node.kind,
        description: node.description,
        exec: node.exec,
        data: node.data,
      })),
      count: nodes.length,
      summary: `Workflow definition guide loaded with ${nodes.length} node definition(s)${kind ? ` for ${kind}` : ""}`,
    };
  } catch (error) {
    sdk.console.error("Error getting workflow definition guide:", error);
    return {
      success: false,
      error: `Failed to get workflow definition guide: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary:
        "Failed to get workflow definition guide due to unexpected error",
    };
  }
};

export const generate_workflow_template = (_sdk: SDK, input: any) => {
  const kind = String(input.kind || "CONVERT").toUpperCase();
  const template = String(input.template || "").toUpperCase();
  const name = input.name || `${kind} workflow`;
  const nodeDefinitionId = input.node_definition_id || "caido/code-js";

  const definition =
    template === "AUTH_CAPTURE"
      ? authCaptureTemplate(
          name,
          input.variable_name || "SESSION_TOKEN",
          authExtractionCode(input),
        )
      : kind === "ACTIVE"
        ? activeTemplate(name)
        : kind === "PASSIVE"
          ? passiveTemplate(name)
          : convertTemplate(name, nodeDefinitionId);

  return {
    success: true,
    definition,
    summary: `Generated ${definition.kind.toUpperCase()} workflow template. Edit node inputs, then validate with test_${definition.kind}_workflow before create_workflow.`,
  };
};

export const toggle_workflow = async (sdk: SDK, input: any) => {
  try {
    const id = input.id;
    const enabled = input.enabled;
    if (!id || typeof enabled !== "boolean") {
      return {
        success: false,
        error: "Workflow ID and boolean enabled value are required",
        summary: "Please provide id and enabled",
      };
    }

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: TOGGLE_WORKFLOW_MUTATION,
      variables: { id, enabled },
      operationName: "toggleWorkflow",
    });

    const payload = result.data?.toggleWorkflow;
    if (!result.success || payload?.error || !payload?.workflow) {
      return {
        success: false,
        error: payload?.error || result.error || "Failed to toggle workflow",
        summary: `Failed to set workflow ${id} enabled=${enabled}`,
      };
    }

    return {
      success: true,
      workflow: payload.workflow,
      summary: `Workflow ${payload.workflow.id} is now ${payload.workflow.enabled ? "enabled" : "disabled"}`,
    };
  } catch (error) {
    sdk.console.error("Error toggling workflow:", error);
    return {
      success: false,
      error: `Failed to toggle workflow: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to toggle workflow due to unexpected error",
    };
  }
};

export const create_workflow = async (sdk: SDK, input: any) => {
  try {
    if (!input.definition) {
      return {
        success: false,
        error: "Workflow definition is required",
        summary: "Please provide a workflow definition object or JSON string",
      };
    }

    const definition = parseDefinition(input.definition);
    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: CREATE_WORKFLOW_MUTATION,
      variables: {
        input: {
          definition,
          global: input.global === true,
        },
      },
      operationName: "createWorkflow",
    });

    const payload = result.data?.createWorkflow;
    if (!result.success || payload?.error || !payload?.workflow) {
      return {
        success: false,
        error: workflowPayloadError(payload, result.error),
        summary: "Failed to create workflow",
      };
    }

    return {
      success: true,
      workflow: payload.workflow,
      workflow_id: payload.workflow.id,
      summary: `Created workflow ${payload.workflow.id}: ${payload.workflow.name}`,
    };
  } catch (error) {
    sdk.console.error("Error creating workflow:", error);
    return {
      success: false,
      error: `Failed to create workflow: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to create workflow due to unexpected error",
    };
  }
};

export const update_workflow = async (sdk: SDK, input: any) => {
  try {
    const id = input.id;
    if (!id || !input.definition) {
      return {
        success: false,
        error: "Workflow ID and definition are required",
        summary: "Please provide id and definition",
      };
    }

    const definition = parseDefinition(input.definition);
    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: UPDATE_WORKFLOW_MUTATION,
      variables: { id, input: { definition } },
      operationName: "updateWorkflow",
    });

    const payload = result.data?.updateWorkflow;
    if (!result.success || payload?.error || !payload?.workflow) {
      return {
        success: false,
        error: workflowPayloadError(payload, result.error),
        summary: `Failed to update workflow ${id}`,
      };
    }

    return {
      success: true,
      workflow: payload.workflow,
      summary: `Updated workflow ${payload.workflow.id}: ${payload.workflow.name}`,
    };
  } catch (error) {
    sdk.console.error("Error updating workflow:", error);
    return {
      success: false,
      error: `Failed to update workflow: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to update workflow due to unexpected error",
    };
  }
};

export const rename_workflow = async (sdk: SDK, input: any) => {
  try {
    const id = input.id;
    const name = input.name;
    if (!id || !name) {
      return {
        success: false,
        error: "Workflow ID and name are required",
        summary: "Please provide id and name",
      };
    }

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: RENAME_WORKFLOW_MUTATION,
      variables: { id, name },
      operationName: "renameWorkflow",
    });

    const payload = result.data?.renameWorkflow;
    if (!result.success || payload?.error || !payload?.workflow) {
      return {
        success: false,
        error: workflowPayloadError(payload, result.error),
        summary: `Failed to rename workflow ${id}`,
      };
    }

    return {
      success: true,
      workflow: payload.workflow,
      summary: `Renamed workflow ${payload.workflow.id} to ${payload.workflow.name}`,
    };
  } catch (error) {
    sdk.console.error("Error renaming workflow:", error);
    return {
      success: false,
      error: `Failed to rename workflow: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to rename workflow due to unexpected error",
    };
  }
};

export const delete_workflow = async (sdk: SDK, input: any) => {
  try {
    const id = input.id;
    if (!id) {
      return {
        success: false,
        error: "Workflow ID is required",
        summary: "Please provide id",
      };
    }

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: DELETE_WORKFLOW_MUTATION,
      variables: { id },
      operationName: "deleteWorkflow",
    });

    const payload = result.data?.deleteWorkflow;
    if (!result.success || payload?.error || !payload?.deletedId) {
      return {
        success: false,
        error: workflowPayloadError(payload, result.error),
        summary: `Failed to delete workflow ${id}`,
      };
    }

    return {
      success: true,
      deleted_id: payload.deletedId,
      summary: `Deleted workflow ${payload.deletedId}`,
    };
  } catch (error) {
    sdk.console.error("Error deleting workflow:", error);
    return {
      success: false,
      error: `Failed to delete workflow: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to delete workflow due to unexpected error",
    };
  }
};

const moveWorkflowScope = async (
  sdk: SDK,
  input: any,
  query: string,
  operationName: "globalizeWorkflow" | "localizeWorkflow",
) => {
  const id = input.id;
  if (!id) {
    return {
      success: false,
      error: "Workflow ID is required",
      summary: "Please provide id",
    };
  }

  const result = await executeGraphQLQueryviaSDK(sdk, {
    query,
    variables: { id },
    operationName,
  });

  const payload = result.data?.[operationName];
  if (!result.success || payload?.error || !payload?.workflow) {
    return {
      success: false,
      error: workflowPayloadError(payload, result.error),
      summary: `Failed to ${operationName === "globalizeWorkflow" ? "globalize" : "localize"} workflow ${id}`,
    };
  }

  return {
    success: true,
    workflow: payload.workflow,
    summary: `Workflow ${payload.workflow.id} is now ${payload.workflow.global ? "global" : "local"}`,
  };
};

export const globalize_workflow = async (sdk: SDK, input: any) => {
  try {
    return await moveWorkflowScope(
      sdk,
      input,
      GLOBALIZE_WORKFLOW_MUTATION,
      "globalizeWorkflow",
    );
  } catch (error) {
    sdk.console.error("Error globalizing workflow:", error);
    return {
      success: false,
      error: `Failed to globalize workflow: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to globalize workflow due to unexpected error",
    };
  }
};

export const localize_workflow = async (sdk: SDK, input: any) => {
  try {
    return await moveWorkflowScope(
      sdk,
      input,
      LOCALIZE_WORKFLOW_MUTATION,
      "localizeWorkflow",
    );
  } catch (error) {
    sdk.console.error("Error localizing workflow:", error);
    return {
      success: false,
      error: `Failed to localize workflow: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to localize workflow due to unexpected error",
    };
  }
};

export const run_active_workflow = async (sdk: SDK, input: any) => {
  try {
    const id = input.id;
    const requestId = input.request_id;
    if (!id || !requestId) {
      return {
        success: false,
        error: "Workflow ID and request_id are required",
        summary: "Please provide id and request_id",
      };
    }

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: RUN_ACTIVE_WORKFLOW_MUTATION,
      variables: { id, input: { requestId } },
      operationName: "runActiveWorkflow",
    });

    const payload = result.data?.runActiveWorkflow;
    if (!result.success || payload?.error || !payload?.task) {
      return {
        success: false,
        error: payload?.error || result.error || "Failed to run workflow",
        summary: `Failed to run active workflow ${id} for request ${requestId}`,
      };
    }

    return {
      success: true,
      task: payload.task,
      summary: `Started workflow task ${payload.task.id} for request ${requestId}`,
    };
  } catch (error) {
    sdk.console.error("Error running active workflow:", error);
    return {
      success: false,
      error: `Failed to run active workflow: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to run active workflow due to unexpected error",
    };
  }
};

export const run_convert_workflow = async (sdk: SDK, input: any) => {
  try {
    const id = input.id;
    const raw = input.raw;
    const rawBase64 = input.raw_base64;
    if (!id || (!raw && !rawBase64)) {
      return {
        success: false,
        error: "Workflow ID and raw or raw_base64 input are required",
        summary: "Please provide id and raw or raw_base64",
      };
    }

    const blobInput = rawBase64 || Buffer.from(raw, "utf8").toString("base64");
    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: RUN_CONVERT_WORKFLOW_MUTATION,
      variables: { id, input: blobInput },
      operationName: "runConvertWorkflow",
    });

    const payload = result.data?.runConvertWorkflow;
    if (!result.success || payload?.error) {
      return {
        success: false,
        error: payload?.error || result.error || "Failed to run workflow",
        summary: `Failed to run convert workflow ${id}`,
      };
    }

    let outputDecoded = null;
    if (payload?.output) {
      try {
        outputDecoded = Buffer.from(payload.output, "base64").toString("utf8");
      } catch (_error) {
        outputDecoded = null;
      }
    }

    return {
      success: true,
      output: payload?.output,
      output_decoded: outputDecoded,
      summary: `Convert workflow ${id} completed`,
    };
  } catch (error) {
    sdk.console.error("Error running convert workflow:", error);
    return {
      success: false,
      error: `Failed to run convert workflow: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to run convert workflow due to unexpected error",
    };
  }
};

export const test_active_workflow = async (sdk: SDK, input: any) => {
  try {
    if (!input.definition) {
      return {
        success: false,
        error: "Workflow definition is required",
        summary: "Please provide a workflow definition",
      };
    }
    const request = buildRawRequestInput(input);
    if (!request) {
      return {
        success: false,
        error: "request_raw or request_raw_base64 is required",
        summary: "Please provide a raw request for workflow testing",
      };
    }

    const response = buildRawResponseInput(input);
    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: TEST_ACTIVE_WORKFLOW_MUTATION,
      variables: {
        input: {
          definition: parseDefinition(input.definition),
          request,
          ...(response ? { response } : {}),
        },
      },
      operationName: "testWorkflowActive",
    });

    const payload = result.data?.testWorkflowActive;
    if (!result.success || payload?.error) {
      return {
        success: false,
        error: workflowPayloadError(payload, result.error),
        summary: "Active workflow test failed",
      };
    }

    return {
      success: true,
      run_state: payload.runState,
      summary: "Active workflow test completed",
    };
  } catch (error) {
    sdk.console.error("Error testing active workflow:", error);
    return {
      success: false,
      error: `Failed to test active workflow: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to test active workflow due to unexpected error",
    };
  }
};

export const test_passive_workflow = async (sdk: SDK, input: any) => {
  try {
    if (!input.definition) {
      return {
        success: false,
        error: "Workflow definition is required",
        summary: "Please provide a workflow definition",
      };
    }
    const request = buildRawRequestInput(input);
    if (!request) {
      return {
        success: false,
        error: "request_raw or request_raw_base64 is required",
        summary: "Please provide a raw request for workflow testing",
      };
    }

    const response = buildRawResponseInput(input);
    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: TEST_PASSIVE_WORKFLOW_MUTATION,
      variables: {
        input: {
          definition: parseDefinition(input.definition),
          request,
          ...(response ? { response } : {}),
        },
      },
      operationName: "testWorkflowPassive",
    });

    const payload = result.data?.testWorkflowPassive;
    if (!result.success || payload?.error) {
      return {
        success: false,
        error: workflowPayloadError(payload, result.error),
        summary: "Passive workflow test failed",
      };
    }

    return {
      success: true,
      run_state: payload.runState,
      summary: "Passive workflow test completed",
    };
  } catch (error) {
    sdk.console.error("Error testing passive workflow:", error);
    return {
      success: false,
      error: `Failed to test passive workflow: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to test passive workflow due to unexpected error",
    };
  }
};

export const test_convert_workflow = async (sdk: SDK, input: any) => {
  try {
    if (!input.definition) {
      return {
        success: false,
        error: "Workflow definition is required",
        summary: "Please provide a workflow definition",
      };
    }

    const raw = input.raw;
    const rawBase64 = input.raw_base64;
    if (!raw && !rawBase64) {
      return {
        success: false,
        error: "raw or raw_base64 is required",
        summary: "Please provide input for convert workflow testing",
      };
    }

    const result = await executeGraphQLQueryviaSDK(sdk, {
      query: TEST_CONVERT_WORKFLOW_MUTATION,
      variables: {
        input: {
          definition: parseDefinition(input.definition),
          data: toBase64(rawBase64 || raw, !!rawBase64),
        },
      },
      operationName: "testWorkflowConvert",
    });

    const payload = result.data?.testWorkflowConvert;
    if (!result.success || payload?.error) {
      return {
        success: false,
        error: workflowPayloadError(payload, result.error),
        summary: "Convert workflow test failed",
      };
    }

    let outputDecoded = null;
    if (payload.output) {
      try {
        outputDecoded = Buffer.from(payload.output, "base64").toString("utf8");
      } catch (_error) {
        outputDecoded = null;
      }
    }

    return {
      success: true,
      output: payload.output,
      output_decoded: outputDecoded,
      run_state: payload.runState,
      summary: "Convert workflow test completed",
    };
  } catch (error) {
    sdk.console.error("Error testing convert workflow:", error);
    return {
      success: false,
      error: `Failed to test convert workflow: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to test convert workflow due to unexpected error",
    };
  }
};
