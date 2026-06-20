// GraphQL queries and mutations for workflow operations

export const WORKFLOW_FIELDS = `
  fragment workflowFields on Workflow {
    id
    name
    kind
    enabled
    global
    readOnly
    definition
    createdAt
    updatedAt
  }
`;

const UNKNOWN_OR_OTHER_ERROR_FIELDS = `
  __typename
  ... on UnknownIdUserError {
    id
    code
  }
  ... on OtherUserError {
    code
  }
`;

const OTHER_ERROR_FIELDS = `
  __typename
  ... on OtherUserError {
    code
  }
`;

const WORKFLOW_USER_ERROR_FIELDS = `
  ... on WorkflowUserError {
    code
    reason
    node
    message
  }
`;

const PERMISSION_DENIED_ERROR_FIELDS = `
  ... on PermissionDeniedUserError {
    code
    reason
  }
`;

const READ_ONLY_ERROR_FIELDS = `
  ... on ReadOnlyUserError {
    code
  }
`;

export const WORKFLOWS_QUERY = `
  query workflows {
    workflows {
      ...workflowFields
    }
  }
  ${WORKFLOW_FIELDS}
`;

export const WORKFLOW_QUERY = `
  query workflow($id: ID!) {
    workflow(id: $id) {
      ...workflowFields
    }
  }
  ${WORKFLOW_FIELDS}
`;

export const WORKFLOW_NODE_DEFINITIONS_QUERY = `
  query workflowNodeDefinitions {
    workflowNodeDefinitions {
      raw
    }
  }
`;

export const TOGGLE_WORKFLOW_MUTATION = `
  mutation toggleWorkflow($id: ID!, $enabled: Boolean!) {
    toggleWorkflow(id: $id, enabled: $enabled) {
      workflow {
        ...workflowFields
      }
      error {
        ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
      }
    }
  }
  ${WORKFLOW_FIELDS}
`;

export const CREATE_WORKFLOW_MUTATION = `
  mutation createWorkflow($input: CreateWorkflowInput!) {
    createWorkflow(input: $input) {
      workflow {
        ...workflowFields
      }
      error {
        ${WORKFLOW_USER_ERROR_FIELDS}
        ${PERMISSION_DENIED_ERROR_FIELDS}
        ${OTHER_ERROR_FIELDS}
      }
    }
  }
  ${WORKFLOW_FIELDS}
`;

export const UPDATE_WORKFLOW_MUTATION = `
  mutation updateWorkflow($id: ID!, $input: UpdateWorkflowInput!) {
    updateWorkflow(id: $id, input: $input) {
      workflow {
        ...workflowFields
      }
      error {
        ${WORKFLOW_USER_ERROR_FIELDS}
        ${READ_ONLY_ERROR_FIELDS}
        ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
      }
    }
  }
  ${WORKFLOW_FIELDS}
`;

export const RENAME_WORKFLOW_MUTATION = `
  mutation renameWorkflow($id: ID!, $name: String!) {
    renameWorkflow(id: $id, name: $name) {
      workflow {
        ...workflowFields
      }
      error {
        ${READ_ONLY_ERROR_FIELDS}
        ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
      }
    }
  }
  ${WORKFLOW_FIELDS}
`;

export const DELETE_WORKFLOW_MUTATION = `
  mutation deleteWorkflow($id: ID!) {
    deleteWorkflow(id: $id) {
      deletedId
      error {
        ${READ_ONLY_ERROR_FIELDS}
        ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
      }
    }
  }
`;

export const GLOBALIZE_WORKFLOW_MUTATION = `
  mutation globalizeWorkflow($id: ID!) {
    globalizeWorkflow(id: $id) {
      workflow {
        ...workflowFields
      }
      error {
        ${WORKFLOW_USER_ERROR_FIELDS}
        ${READ_ONLY_ERROR_FIELDS}
        ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
      }
    }
  }
  ${WORKFLOW_FIELDS}
`;

export const LOCALIZE_WORKFLOW_MUTATION = `
  mutation localizeWorkflow($id: ID!) {
    localizeWorkflow(id: $id) {
      workflow {
        ...workflowFields
      }
      error {
        ${WORKFLOW_USER_ERROR_FIELDS}
        ${READ_ONLY_ERROR_FIELDS}
        ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
      }
    }
  }
  ${WORKFLOW_FIELDS}
`;

export const RUN_ACTIVE_WORKFLOW_MUTATION = `
  mutation runActiveWorkflow($id: ID!, $input: RunActiveWorkflowInput!) {
    runActiveWorkflow(id: $id, input: $input) {
      task {
        id
      }
      error {
        ${PERMISSION_DENIED_ERROR_FIELDS}
        ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
      }
    }
  }
`;

export const RUN_CONVERT_WORKFLOW_MUTATION = `
  mutation runConvertWorkflow($id: ID!, $input: Blob!) {
    runConvertWorkflow(id: $id, input: $input) {
      output
      error {
        ${WORKFLOW_USER_ERROR_FIELDS}
        ${PERMISSION_DENIED_ERROR_FIELDS}
        ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
      }
    }
  }
`;

export const TEST_ACTIVE_WORKFLOW_MUTATION = `
  mutation testWorkflowActive($input: TestWorkflowActiveInput!) {
    testWorkflowActive(input: $input) {
      runState
      error {
        ${WORKFLOW_USER_ERROR_FIELDS}
        ${PERMISSION_DENIED_ERROR_FIELDS}
        ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
      }
    }
  }
`;

export const TEST_PASSIVE_WORKFLOW_MUTATION = `
  mutation testWorkflowPassive($input: TestWorkflowPassiveInput!) {
    testWorkflowPassive(input: $input) {
      runState
      error {
        ${WORKFLOW_USER_ERROR_FIELDS}
        ${PERMISSION_DENIED_ERROR_FIELDS}
        ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
      }
    }
  }
`;

export const TEST_CONVERT_WORKFLOW_MUTATION = `
  mutation testWorkflowConvert($input: TestWorkflowConvertInput!) {
    testWorkflowConvert(input: $input) {
      output
      runState
      error {
        ${WORKFLOW_USER_ERROR_FIELDS}
        ${PERMISSION_DENIED_ERROR_FIELDS}
        ${UNKNOWN_OR_OTHER_ERROR_FIELDS}
      }
    }
  }
`;
