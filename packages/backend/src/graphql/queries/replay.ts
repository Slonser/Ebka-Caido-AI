// GraphQL queries and mutations for replay operations

// Mutation for renaming a replay session
export const RENAME_REPLAY_SESSION_MUTATION = `
  mutation renameReplaySession($id: ID!, $name: String!) {
    renameReplaySession(id: $id, name: $name) {
      session {
        id
        name
      }
    }
  }
`;

// Mutation for creating a replay session collection
export const CREATE_REPLAY_SESSION_COLLECTION_MUTATION = `
  mutation createReplaySessionCollection($input: CreateReplaySessionCollectionInput!) {
    createReplaySessionCollection(input: $input) {
      collection {
        id
        name
      }
    }
  }
`;

// Mutation for renaming a replay session collection
export const RENAME_REPLAY_SESSION_COLLECTION_MUTATION = `
  mutation renameReplaySessionCollection($id: ID!, $name: String!) {
    renameReplaySessionCollection(id: $id, name: $name) {
      collection {
        ...replaySessionCollectionMeta
      }
    }
  }
`;

// GraphQL fragments for replay operations
export const REPLAY_FRAGMENTS = {
  connectionInfoFull: `
    fragment connectionInfoFull on ConnectionInfo {
      __typename
      host
      port
      isTLS
      SNI
    }
  `,
  requestMetadataFull: `
    fragment requestMetadataFull on RequestMetadata {
      __typename
      id
      color
    }
  `,
  responseMeta: `
    fragment responseMeta on Response {
      __typename
      id
      statusCode
      roundtripTime
      length
      createdAt
      alteration
      edited
    }
  `,
  requestMeta: `
    fragment requestMeta on Request {
      __typename
      id
      host
      port
      path
      query
      method
      edited
      isTls
      sni
      length
      alteration
      metadata {
        ...requestMetadataFull
      }
      fileExtension
      source
      createdAt
      response {
        ...responseMeta
      }
      stream {
        id
      }
    }
  `,
  replayEntryMeta: `
    fragment replayEntryMeta on ReplayEntry {
      __typename
      id
      error
      connection {
        ...connectionInfoFull
      }
      session {
        id
      }
      request {
        ...requestMeta
      }
    }
  `,
  replaySessionMeta: `
    fragment replaySessionMeta on ReplaySession {
      __typename
      id
      name
      activeEntry {
        ...replayEntryMeta
      }
      collection {
        id
      }
      entries {
        nodes {
          ...replayEntryMeta
        }
      }
    }
  `,
  replaySessionCollectionMeta: `
    fragment replaySessionCollectionMeta on ReplaySessionCollection {
      __typename
      id
      name
      sessions {
        ...replaySessionMeta
      }
    }
  `,
};

// Function to get all replay fragments
export const getReplayFragments = () => {
  return Object.values(REPLAY_FRAGMENTS).join("\n");
};

// Function to get fragments needed for move replay session
export const getMoveReplaySessionFragments = () => {
  return [
    REPLAY_FRAGMENTS.connectionInfoFull,
    REPLAY_FRAGMENTS.requestMetadataFull,
    REPLAY_FRAGMENTS.responseMeta,
    REPLAY_FRAGMENTS.requestMeta,
    REPLAY_FRAGMENTS.replayEntryMeta,
    REPLAY_FRAGMENTS.replaySessionMeta,
  ].join("\n");
};

// Function to get fragments needed for start replay task
export const getStartReplayTaskFragments = () => {
  return [
    REPLAY_FRAGMENTS.connectionInfoFull,
    REPLAY_FRAGMENTS.requestMetadataFull,
    REPLAY_FRAGMENTS.responseMeta,
    REPLAY_FRAGMENTS.requestMeta,
    REPLAY_FRAGMENTS.replayEntryMeta,
  ].join("\n");
};

// Function to get fragments needed for rename replay session collection
export const getRenameReplaySessionCollectionFragments = () => {
  return Object.values(REPLAY_FRAGMENTS).join("\n");
};

// Mutation for moving a replay session to a different collection
export const MOVE_REPLAY_SESSION_MUTATION = `
  mutation moveReplaySession($id: ID!, $collectionId: ID!) {
    moveReplaySession(collectionId: $collectionId, id: $id) {
      session {
        ...replaySessionMeta
      }
    }
  }
`;

// Mutation for starting a replay task
export const START_REPLAY_TASK_MUTATION = `
  mutation startReplayTask($sessionId: ID!) {
    startReplayTask(sessionId: $sessionId) {
      task {
        id
        createdAt
        sessionKind
        replayEntry {
          __typename
          id
          error
          createdAt
          session {
            id
            name
          }
          ... on ReplayEntryHttp {
            connection {
              host
              port
              isTLS
              SNI
            }
            request {
              id
              method
              host
              path
              response {
                id
                statusCode
              }
            }
          }
          ... on ReplayEntryWs {
            stream {
              id
              host
              port
              path
              protocol
            }
          }
        }
      }
      error {
        ... on TaskInProgressUserError {
          code
          taskId
        }
        ... on PermissionDeniedUserError {
          code
          reason
        }
        ... on CloudUserError {
          code
          reason
        }
        ... on OtherUserError {
          code
        }
      }
    }
  }
`;

export const REPLAY_SESSION_QUERY = `
  query replaySession($id: ID!) {
    replaySession(id: $id) {
      __typename
      id
      name
      rank
      ... on ReplaySessionHttp {
        activeEntry {
          __typename
          id
          error
          createdAt
        }
        entries(first: 20, order: { by: ID, ordering: DESC }) {
          nodes {
            __typename
            id
            error
            createdAt
            ... on ReplayEntryHttp {
              connection {
                host
                port
                isTLS
                SNI
              }
              request {
                id
                method
                host
                path
              }
            }
          }
        }
        collection {
          id
          name
        }
      }
      ... on ReplaySessionWs {
        activeEntry {
          __typename
          id
          error
          createdAt
        }
        entries(first: 20, order: { by: ID, ordering: DESC }) {
          nodes {
            __typename
            id
            error
            createdAt
            ... on ReplayEntryWs {
              stream {
                id
                host
                port
                path
                protocol
              }
              messages {
                id
                head {
                  id
                  direction
                  format
                  length
                  createdAt
                }
              }
              draft {
                direction
                format
                raw
              }
            }
          }
        }
        collection {
          id
          name
        }
      }
    }
  }
`;

export const REPLAY_SESSIONS_QUERY = `
  query replaySessions($first: Int, $after: String) {
    replaySessions(first: $first, after: $after) {
      edges {
        cursor
        node {
          __typename
          id
          name
          rank
          ... on ReplaySessionHttp {
            activeEntry {
              id
            }
            collection {
              id
              name
            }
          }
          ... on ReplaySessionWs {
            activeEntry {
              id
            }
            collection {
              id
              name
            }
          }
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
`;

export const CREATE_REPLAY_SESSION_MUTATION = `
  mutation createReplaySession($input: CreateReplaySessionInput!) {
    createReplaySession(input: $input) {
      session {
        __typename
        id
        name
        rank
        ... on ReplaySessionHttp {
          collection {
            id
            name
          }
          activeEntry {
            id
          }
        }
        ... on ReplaySessionWs {
          collection {
            id
            name
          }
          activeEntry {
            id
          }
        }
      }
      error {
        __typename
      }
    }
  }
`;

export const UPDATE_REPLAY_WS_DRAFT_MUTATION = `
  mutation updateReplayWsDraft($id: ID!, $input: UpdateReplayEntryDraftInput!) {
    updateReplayEntryDraft(id: $id, input: $input) {
      entry {
        __typename
        id
        error
        createdAt
        ... on ReplayEntryWs {
          draft {
            raw
            direction
            format
            editorState
          }
        }
      }
    }
  }
`;

export const UPDATE_REPLAY_HTTP_DRAFT_MUTATION = `
  mutation updateReplayHttpDraft($id: ID!, $input: UpdateReplayEntryDraftInput!) {
    updateReplayEntryDraft(id: $id, input: $input) {
      entry {
        __typename
        id
        error
        createdAt
        ... on ReplayEntryHttp {
          draft {
            raw
            editorState
            connection {
              host
              port
              isTLS
              SNI
            }
            settings {
              placeholders {
                inputRange {
                  start
                  end
                }
                outputRange {
                  start
                  end
                }
                preprocessors {
                  options {
                    __typename
                    ... on ReplayPrefixPreprocessor {
                      value
                    }
                    ... on ReplaySuffixPreprocessor {
                      value
                    }
                    ... on ReplayUrlEncodePreprocessor {
                      charset
                      nonAscii
                    }
                    ... on ReplayWorkflowPreprocessor {
                      id
                    }
                    ... on ReplayEnvironmentPreprocessor {
                      variableName
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const CLEAR_REPLAY_ENTRY_DRAFT_MUTATION = `
  mutation clearReplayEntryDraft($id: ID!, $kind: ReplaySessionKind!) {
    clearReplayEntryDraft(id: $id, kind: $kind) {
      entry {
        __typename
        id
        error
        createdAt
      }
    }
  }
`;

export const SEND_REPLAY_WS_MESSAGE_MUTATION = `
  mutation sendReplayTaskMessage($task: ID!, $input: SendReplayTaskMessageInput!) {
    sendReplayTaskMessage(task: $task, input: $input) {
      message {
        __typename
        ... on StreamWsMessage {
          id
          head {
            id
            length
            alteration
            direction
            format
            createdAt
            raw
          }
        }
      }
      error {
        __typename
      }
    }
  }
`;

export const SEND_REPLAY_WS_DRAFT_MUTATION = `
  mutation sendReplayTaskMessageDraft($task: ID!) {
    sendReplayTaskMessageDraft(task: $task) {
      message {
        __typename
        ... on StreamWsMessage {
          id
          head {
            id
            length
            alteration
            direction
            format
            createdAt
            raw
          }
        }
      }
      error {
        __typename
      }
    }
  }
`;

export const STOP_REPLAY_WS_TASKS_MUTATION = `
  mutation stopReplayWsTasks($taskIds: [ID!]!) {
    stopReplayWsTasks(taskIds: $taskIds) {
      error {
        __typename
      }
    }
  }
`;

// Query for getting replay session collections
export const getDefaultReplayCollectionsQuery = () => `
  query replaySessionCollections {
    replaySessionCollections {
      edges {
        node {
          ...replaySessionCollectionMeta
        }
      }
    }
  }
  
  ${REPLAY_FRAGMENTS.connectionInfoFull}
  ${REPLAY_FRAGMENTS.requestMetadataFull}
  ${REPLAY_FRAGMENTS.responseMeta}
  ${REPLAY_FRAGMENTS.requestMeta}
  ${REPLAY_FRAGMENTS.replayEntryMeta}
  ${REPLAY_FRAGMENTS.replaySessionMeta}
  ${REPLAY_FRAGMENTS.replaySessionCollectionMeta}
`;
