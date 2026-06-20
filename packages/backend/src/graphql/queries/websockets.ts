// GraphQL queries for WebSocket operations

export const WEBSOCKET_STREAMS_QUERY = `
  query websocketStreamsByOffset($offset: Int!, $limit: Int!, $scopeId: ID, $order: StreamOrderInput!, $filter: StreamQLInput) {
    streamsByOffset(
      offset: $offset
      limit: $limit
      scopeId: $scopeId
      order: $order
      filter: $filter
    ) {
      edges {
        cursor
        node {
          id
          createdAt
          direction
          host
          isTls
          path
          port
          protocol
          source
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
      snapshot
    }
  }
`;

export const WEBSOCKET_MESSAGE_COUNT_QUERY = `
  query websocketMessageCount($streamId: ID!) {
    streamWsMessages(first: 0, streamId: $streamId) {
      count {
        value
        snapshot
      }
    }
  }
`;

export const WEBSOCKET_STREAM_QUERY = `
  query websocketStream($id: ID!) {
    stream(id: $id) {
      id
      createdAt
      direction
      host
      isTls
      path
      port
      protocol
      source
    }
  }
`;

export const WEBSOCKET_MESSAGES_QUERY = `
  query websocketMessagesByOffset($streamId: ID!, $offset: Int, $limit: Int, $order: StreamWsMessageOrderInput, $filter: StreamQLInput) {
    streamWsMessagesByOffset(
      streamId: $streamId
      offset: $offset
      limit: $limit
      order: $order
      filter: $filter
    ) {
      edges {
        cursor
        node {
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
          edits {
            id
            alteration
          }
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
      snapshot
      count {
        value
        snapshot
      }
    }
  }
`;

export const WEBSOCKET_MESSAGE_QUERY = `
  query websocketMessageEdit($id: ID!) {
    streamWsMessageEdit(id: $id) {
      id
      length
      alteration
      direction
      format
      createdAt
      raw
    }
  }
`;
