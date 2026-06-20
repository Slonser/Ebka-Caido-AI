export const tools_version = "0.1.10";
export const tools_description = [
    {
        name: "list_by_httpql",
        description: "List proxied requests (HTTP history) by HTTPQL query",
        input_schema: {
            type: "object",
            properties: {
                httpql: {
                    type: "string",
                    description: `The HTTPQL query to filter requests. HTTPQL is the query language we use in Caido to let you filtering requests and responses.
req: HTTP requests.
resp: HTTP responses.
row: A table row.

req:
ext: The file extension (if present). Extensions in Caido always contain the leading . (such as .js).
host: The hostname of the target server.
method: The HTTP Method used for the request in uppercase. If the request is malformed, this will contain the bytes read until the first whitespace.
path: The path of the query, including the extension.
port: The port of the target server.
raw: The full raw data of the request. This allows you to search by elements that Caido currently does not index (such as headers).
created_at: The date and time the request was sent.

resp:
code: The status code of the response. If the response is malformed, this will contain everything after HTTP/1.1 and the following whitespace.
raw: The full raw data of the response. This allows you to search by elements that Caido currently does not index (such as headers).
roundtrip: The total time taken (in milliseconds) for the request to travel from the client to the server and for the response to travel back from the server to the client.

row
id: The numerical ID of a table row.


Operator and Value
The Value types and associated Operators that Caido supports include:

Integers
These Operators work on Fields that are numerical (port, code, roundtrip and id).

eq: Equal to the supplied value.
gt: Greater than the supplied value.
gte: Greater than or equal to the supplied value.
lt: Less than the supplied value.
lte: Less than or equal to the supplied value.
ne: Not equal to the supplied value.
String/Bytes
These Operators work on Fields that are text or byte values (ext, host, method, path, query and raw).

cont: Contains the supplied value.
eq: Equal to the supplied value.
like: The SQLite LIKE Operator.
ncont: Does not contain the supplied value.
ne: Not equal to the supplied value.
nlike: The SQLite NOT LIKE Operator.
TIPS

The cont and ncont Operators are case insensitive.
In SQLite - the % character matches zero or more characters (such as %.js to match .map.js) and the _ character matches one character (such as v_lue to match vAlue).
The like Operator is case sensitive for unicode characters that are beyond the ASCII range.

Regex
These Operators work on Fields that are text or byte values (that are text or byte values (ext, host, method, path, query and raw_).

regex: Matches the regex /value.+/.
nregex: Doesn't match the regex /value.+/.

INFO

Not all regex features are currently supported by Caido (such as look-ahead expressions) as they are not included in the regex library of Rust.

Logical Operators
Caido offers two Logical Operators:

AND: Both the left and right clauses must be true.
OR: Either the left or right clause must be true.


Date/Time
These Operators work on the created_at Field.

gt: Greater than the supplied value.
lt: Less than the supplied value.
The supported time formats for the values used with created_at Operators are:

RFC3339 - example: 2024-06-24T17:03:48+00:00
ISO 8601 - example: 2024-06-24T17:03:48+0000
RFC2822 - example: Mon, 24 Jun 2024 17:03:48 +0000
RFC7231 - example: Mon, 24 Jun 2024 17:03:48 GMT
ISO9075 - example: 2024-06-24T17:03:48Z


Example:
(req.host.eq:"example.com" AND req.path.cont:"/api/") OR (req.created_at.gt:"2024-06-24T17:03:48+00:00")
`,
                },
            },
            required: ["httpql"],
        },
    },
    {
        name: "view_request_by_id",
        description: "View a request by its ID",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The ID of the request to view",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "view_response_by_id",
        description: "View a response by its ID",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The ID of the response to view",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "send_to_replay",
        description: "Send requests to replay tab by their IDs",
        input_schema: {
            type: "object",
            properties: {
                request_ids: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "Array of request IDs to send to replay",
                },
                collection_name: {
                    type: "string",
                    description: "Optional name for the replay session collection (default: 'AI Generated')",
                },
                session_name: {
                    type: "string",
                    description: "Optional name for the replay session (default: 'Request from AI')",
                },
            },
            required: ["request_ids"],
        },
    },
    {
        name: "list_replay_collections",
        description: "List all available replay session collections",
        input_schema: {
            type: "object",
            properties: {
                include_sessions: {
                    type: "boolean",
                    description: "Whether to include sessions within each collection (default: false)",
                },
                filter_name: {
                    type: "string",
                    description: "Optional filter to search collections by name (case-insensitive)",
                },
            },
            required: [],
        },
    },
    {
        name: "rename_replay_collection",
        description: "Rename an existing replay session collection",
        input_schema: {
            type: "object",
            properties: {
                collection_id: {
                    type: "string",
                    description: "The ID of the collection to rename",
                },
                new_name: {
                    type: "string",
                    description: "The new name for the collection",
                },
                verify_existing: {
                    type: "boolean",
                    description: "Whether to check if a collection with the new name already exists (default: true)",
                },
            },
            required: ["collection_id", "new_name"],
        },
    },
    {
        name: "rename_replay_session",
        description: "Rename an existing replay session",
        input_schema: {
            type: "object",
            properties: {
                session_id: {
                    type: "string",
                    description: "The ID of the session to rename",
                },
                new_name: {
                    type: "string",
                    description: "The new name for the session",
                },
            },
            required: ["session_id", "new_name"],
        },
    },
    {
        name: "graphql_collection_requests",
        description: "Execute GraphQL query to get requests (sessions) from a specific replay collection (uses saved auth token)",
        input_schema: {
            type: "object",
            properties: {
                collection_id: {
                    type: "string",
                    description: "The ID of the collection to query",
                },
                graphql_query: {
                    type: "string",
                    description: "Custom GraphQL query to execute (optional, will use default if not provided)",
                },
                variables: {
                    type: "object",
                    description: "Variables to pass to the GraphQL query",
                },
            },
            required: ["collection_id"],
        },
    },
    {
        name: "graphql_list_collections",
        description: "List all replay collections using GraphQL API",
        input_schema: {
            type: "object",
            properties: {
                include_sessions: {
                    type: "boolean",
                    description: "Include session details in the response (default: false)",
                },
                filter_name: {
                    type: "string",
                    description: "Filter collections by name (optional)",
                },
            },
        },
    },
    {
        name: "list_replay_connections",
        description: "List replay connections (requests) in a specific collection by name or ID",
        input_schema: {
            type: "object",
            properties: {
                collection_name: {
                    type: "string",
                    description: "Name of the collection to list connections in",
                },
                collection_id: {
                    type: "string",
                    description: "ID of the collection to list connections in (alternative to collection_name)",
                },
                limit: {
                    type: "number",
                    description: "Maximum number of connections to return (optional)",
                },
            },
            required: [],
        },
    },
    {
        name: "create_findings_from_requests",
        description: "Create a new finding in Caido based on request data",
        input_schema: {
            type: "object",
            properties: {
                title: {
                    type: "string",
                    description: "Title of the finding",
                },
                description: {
                    type: "string",
                    description: "Detailed description of the finding",
                },
                reporter: {
                    type: "string",
                    description: "Name of the person or tool reporting the finding (default: 'Ebka AI Assistant')",
                },
                request_id: {
                    type: "string",
                    description: "ID of the request to associate with the finding",
                },
                severity: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"],
                    description: "Severity level of the finding (default: 'medium')",
                },
                tags: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "Optional tags to categorize the finding",
                },
            },
            required: ["title", "description", "request_id"],
        },
    },
    {
        name: "create_replay_collection",
        description: "Create a new replay session collection using GraphQL API",
        input_schema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name for the new replay session collection",
                },
            },
            required: ["name"],
        },
    },
    {
        name: "create_tamper_rule_collection",
        description: "Create a new tamper rule collection for Match/Replace functionality",
        input_schema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name of the tamper rule collection",
                },
            },
            required: ["name"],
        },
    },
    {
        name: "create_tamper_rule",
        description: "Create a new Match/Replace (Tamper) rule. Replacers can be static terms or Convert workflow IDs from list_workflows(kind: CONVERT).",
        input_schema: {
            type: "object",
            properties: {
                collection_id: {
                    type: "string",
                    description: "ID of the collection to add the rule to",
                },
                name: {
                    type: "string",
                    description: "Name of the tamper rule",
                },
                section: {
                    type: "object",
                    description: "Section configuration for the rule (e.g., responseBody, requestHeader, etc.)",
                    properties: {
                        responseBody: {
                            type: "object",
                            properties: {
                                operation: {
                                    type: "object",
                                    properties: {
                                        raw: {
                                            type: "object",
                                            properties: {
                                                matcher: {
                                                    type: "object",
                                                    properties: {
                                                        regex: {
                                                            type: "object",
                                                            properties: {
                                                                regex: {
                                                                    type: "string",
                                                                    description: "Regular expression pattern to match",
                                                                },
                                                            },
                                                        },
                                                        value: {
                                                            type: "object",
                                                            properties: {
                                                                value: {
                                                                    type: "string",
                                                                    description: "Exact value to match",
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                                replacer: {
                                                    type: "object",
                                                    properties: {
                                                        term: {
                                                            type: "object",
                                                            properties: {
                                                                term: {
                                                                    type: "string",
                                                                    description: "Replacement term",
                                                                },
                                                            },
                                                        },
                                                        workflow: {
                                                            type: "object",
                                                            properties: {
                                                                id: {
                                                                    type: "string",
                                                                    description: "Convert workflow ID used to transform the matched value before replacement",
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        requestHeader: {
                            type: "object",
                            properties: {
                                operation: {
                                    type: "object",
                                    properties: {
                                        update: {
                                            type: "object",
                                            properties: {
                                                matcher: {
                                                    type: "object",
                                                    properties: {
                                                        name: {
                                                            type: "string",
                                                            description: "Header name to match",
                                                        },
                                                    },
                                                },
                                                replacer: {
                                                    type: "object",
                                                    properties: {
                                                        term: {
                                                            type: "object",
                                                            properties: {
                                                                term: {
                                                                    type: "string",
                                                                    description: "Replacement term",
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                condition: {
                    type: "string",
                    description: "Optional HTTPQL condition for when the rule should be applied",
                },
                sources: {
                    type: "array",
                    description: "List of traffic sources the rule applies to. Possible values: INTERCEPT, REPLAY, AUTOMATE, WORKFLOW, SAMPLE, PLUGIN, IMPORT. Defaults to all sources if not specified.",
                    items: {
                        type: "string",
                        enum: [
                            "INTERCEPT",
                            "REPLAY",
                            "AUTOMATE",
                            "WORKFLOW",
                            "SAMPLE",
                            "PLUGIN",
                            "IMPORT",
                        ],
                    },
                },
            },
            required: ["collection_id", "name", "section"],
        },
    },
    {
        name: "update_tamper_rule",
        description: "Update an existing Match/Replace (Tamper) rule. Replacers can be static terms or Convert workflow IDs from list_workflows(kind: CONVERT).",
        input_schema: {
            type: "object",
            properties: {
                rule_id: {
                    type: "string",
                    description: "ID of the tamper rule to update",
                },
                name: {
                    type: "string",
                    description: "New name for the tamper rule (optional)",
                },
                section: {
                    type: "object",
                    description: "New section configuration for the rule (optional)",
                    properties: {
                        responseBody: {
                            type: "object",
                            properties: {
                                operation: {
                                    type: "object",
                                    properties: {
                                        raw: {
                                            type: "object",
                                            properties: {
                                                matcher: {
                                                    type: "object",
                                                    properties: {
                                                        regex: {
                                                            type: "object",
                                                            properties: {
                                                                regex: {
                                                                    type: "string",
                                                                    description: "Regular expression pattern to match",
                                                                },
                                                            },
                                                        },
                                                        value: {
                                                            type: "object",
                                                            properties: {
                                                                value: {
                                                                    type: "string",
                                                                    description: "Exact value to match",
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                                replacer: {
                                                    type: "object",
                                                    properties: {
                                                        term: {
                                                            type: "object",
                                                            properties: {
                                                                term: {
                                                                    type: "string",
                                                                    description: "Replacement term",
                                                                },
                                                            },
                                                        },
                                                        workflow: {
                                                            type: "object",
                                                            properties: {
                                                                id: {
                                                                    type: "string",
                                                                    description: "Convert workflow ID used to transform the matched value before replacement",
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        requestHeader: {
                            type: "object",
                            properties: {
                                operation: {
                                    type: "object",
                                    properties: {
                                        update: {
                                            type: "object",
                                            properties: {
                                                matcher: {
                                                    type: "object",
                                                    properties: {
                                                        name: {
                                                            type: "string",
                                                            description: "Header name to match",
                                                        },
                                                    },
                                                },
                                                replacer: {
                                                    type: "object",
                                                    properties: {
                                                        term: {
                                                            type: "object",
                                                            properties: {
                                                                term: {
                                                                    type: "string",
                                                                    description: "Replacement term",
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                condition: {
                    type: "string",
                    description: "Optional HTTPQL condition for when the rule should be applied",
                },
                sources: {
                    type: "array",
                    description: "List of traffic sources the rule applies to. Possible values: INTERCEPT, REPLAY, AUTOMATE, WORKFLOW, SAMPLE, PLUGIN, IMPORT. Defaults to all sources if not specified.",
                    items: {
                        type: "string",
                        enum: [
                            "INTERCEPT",
                            "REPLAY",
                            "AUTOMATE",
                            "WORKFLOW",
                            "SAMPLE",
                            "PLUGIN",
                            "IMPORT",
                        ],
                    },
                },
            },
            required: ["rule_id"],
        },
    },
    {
        name: "list_tamper_rule_collections",
        description: "List all tamper rule collections",
        input_schema: {
            type: "object",
            properties: {
                collection_id: {
                    type: "string",
                    description: "Optional ID of specific collection to retrieve",
                },
            },
        },
    },
    {
        name: "list_tamper_rules",
        description: "List tamper rules from a specific collection or all rules",
        input_schema: {
            type: "object",
            properties: {
                collection_id: {
                    type: "string",
                    description: "Optional ID of collection to list rules from",
                },
                rule_id: {
                    type: "string",
                    description: "Optional ID of specific rule to retrieve",
                },
            },
        },
    },
    {
        name: "read_tamper_rule",
        description: "Read detailed information about a specific tamper rule",
        input_schema: {
            type: "object",
            properties: {
                rule_id: {
                    type: "string",
                    description: "ID of the tamper rule to read",
                },
            },
            required: ["rule_id"],
        },
    },
    {
        name: "sendRequest",
        description: "Send an HTTP request using the Caido SDK",
        input_schema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "The base URL for the request",
                },
                raw_request: {
                    type: "string",
                    description: "Raw HTTP request string (if provided, other parameters are ignored. Prefer this over the other parameters.)",
                },
                method: {
                    type: "string",
                    description: "HTTP method (GET, POST, PUT, DELETE, etc.)",
                },
                headers: {
                    type: "object",
                    description: "HTTP headers as key-value pairs",
                },
                body: {
                    type: "string",
                    description: "Request body content",
                },
                query: {
                    type: "string",
                    description: "Query parameters",
                },
                host: {
                    type: "string",
                    description: "Target host",
                },
                port: {
                    type: "number",
                    description: "Target port number",
                },
                tls: {
                    type: "boolean",
                    description: "Whether to use TLS/HTTPS",
                },
                path: {
                    type: "string",
                    description: "Request path",
                },
            },
            required: ["url"],
        },
    },
    {
        name: "list_findings",
        description: "List security findings from Caido with pagination and filtering support",
        input_schema: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Maximum number of findings to retrieve (default: 50, max: 200)",
                },
                offset: {
                    type: "number",
                    description: "Number of findings to skip for pagination (default: 0)",
                },
                filter: {
                    type: "object",
                    description: "Optional filter criteria for findings (empty object for no filtering)",
                },
                order: {
                    type: "object",
                    description: "Sorting order for findings (default: by ID descending)",
                    properties: {
                        by: {
                            type: "string",
                            description: "Field to sort by (e.g., 'ID', 'CREATED_AT', 'TITLE')",
                        },
                        ordering: {
                            type: "string",
                            description: "Sort order ('ASC' or 'DESC')",
                        },
                    },
                },
            },
        },
    },
    {
        name: "get_finding_by_id",
        description: "Get detailed information about a specific security finding by its ID",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The unique ID of the finding to retrieve",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "update_finding",
        description: "Update an existing security finding with new title, description, or other fields",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The unique ID of the finding to update",
                },
                input: {
                    type: "object",
                    description: "The data to update the finding with",
                    properties: {
                        title: {
                            type: "string",
                            description: "New title for the finding",
                        },
                        description: {
                            type: "string",
                            description: "New description for the finding",
                        },
                        reporter: {
                            type: "string",
                            description: "New reporter name for the finding",
                        },
                        host: {
                            type: "string",
                            description: "New host for the finding",
                        },
                        path: {
                            type: "string",
                            description: "New path for the finding",
                        },
                    },
                },
            },
            required: ["id", "input"],
        },
    },
    {
        name: "delete_findings",
        description: "Delete one or more security findings by their IDs",
        input_schema: {
            type: "object",
            properties: {
                ids: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "Array of finding IDs to delete",
                },
            },
            required: ["ids"],
        },
    },
    {
        name: "list_replay_sessions",
        description: "List Replay sessions with optional HTTP/WS kind filtering",
        input_schema: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Maximum number of sessions to retrieve (default: 50)",
                },
                after: {
                    type: "string",
                    description: "Optional pagination cursor",
                },
                kind: {
                    type: "string",
                    enum: ["HTTP", "WS"],
                    description: "Optional replay session kind filter",
                },
            },
        },
    },
    {
        name: "get_replay_session",
        description: "Get a Replay session by ID, including recent entries",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The ID of the replay session to retrieve",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "move_replay_session",
        description: "Move a replay session to a different collection",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The ID of the replay session to move",
                },
                collection_id: {
                    type: "string",
                    description: "The ID of the target collection to move the session to",
                },
            },
            required: ["id", "collection_id"],
        },
    },
    {
        name: "start_replay_task",
        description: "Start a replay task for a prepared Replay session. Use update_http_replay_draft or update_websocket_replay_draft first when the draft must be changed.",
        input_schema: {
            type: "object",
            properties: {
                session_id: {
                    type: "string",
                    description: "The ID of the replay session to start the task in",
                },
            },
            required: ["session_id"],
        },
    },
    {
        name: "update_http_replay_draft",
        description: "Update an HTTP Replay entry draft. Placeholders may use Convert workflow preprocessors via options.workflow.id or environment variables via options.environment.variableName.",
        input_schema: {
            type: "object",
            properties: {
                entry_id: {
                    type: "string",
                    description: "The Replay HTTP entry ID to update",
                },
                raw_request: {
                    type: "string",
                    description: "Raw UTF-8 HTTP request draft",
                },
                raw_request_base64: {
                    type: "string",
                    description: "Base64-encoded HTTP request draft",
                },
                connection: {
                    type: "object",
                    description: "Connection info for the draft request",
                    properties: {
                        host: { type: "string" },
                        port: { type: "number" },
                        isTLS: { type: "boolean" },
                        SNI: { type: "string" },
                    },
                },
                placeholders: {
                    type: "array",
                    description: 'Replay placeholders. Workflow preprocessor shape: { inputRange:{start,end}, outputRange:{start,end}, preprocessors:[{ options:{ workflow:{ id:"workflow-id" } } }] }. Environment preprocessor shape: { inputRange:{start,end}, outputRange:{start,end}, preprocessors:[{ options:{ environment:{ variableName:"SESSION_TOKEN" } } }] }',
                },
                editor_state_base64: {
                    type: "string",
                    description: "Optional base64 editor state",
                },
            },
            required: ["entry_id"],
        },
    },
    {
        name: "create_websocket_replay_session",
        description: "Create a WebSocket Replay session from a Caido request ID or raw upgrade request",
        input_schema: {
            type: "object",
            properties: {
                request_id: {
                    type: "string",
                    description: "Optional Caido request ID to use as source",
                },
                raw_request: {
                    type: "string",
                    description: "Optional raw UTF-8 WebSocket upgrade request",
                },
                raw_request_base64: {
                    type: "string",
                    description: "Optional base64-encoded WebSocket upgrade request",
                },
                collection_id: {
                    type: "string",
                    description: "Optional Replay collection ID",
                },
                connection: {
                    type: "object",
                    description: "Connection info for raw_request sources",
                    properties: {
                        host: {
                            type: "string",
                            description: "Target host",
                        },
                        port: {
                            type: "number",
                            description: "Target port",
                        },
                        isTLS: {
                            type: "boolean",
                            description: "Whether to use TLS",
                        },
                        SNI: {
                            type: "string",
                            description: "Server Name Indication for TLS",
                        },
                    },
                },
            },
        },
    },
    {
        name: "update_websocket_replay_draft",
        description: "Update a WebSocket Replay entry draft message",
        input_schema: {
            type: "object",
            properties: {
                entry_id: {
                    type: "string",
                    description: "The Replay WS entry ID to update",
                },
                raw: {
                    type: "string",
                    description: "Raw UTF-8 WebSocket message payload",
                },
                raw_base64: {
                    type: "string",
                    description: "Base64-encoded WebSocket message payload",
                },
                direction: {
                    type: "string",
                    enum: ["CLIENT", "SERVER"],
                    description: "Message direction (default: CLIENT)",
                },
                format: {
                    type: "string",
                    enum: ["TEXT", "BINARY", "CLOSE", "PING", "PONG"],
                    description: "Message format (default: TEXT)",
                },
                server_timeout_ms: {
                    type: "number",
                    description: "Server timeout in milliseconds (default: 30000)",
                },
                editor_state_base64: {
                    type: "string",
                    description: "Optional base64 editor state",
                },
            },
            required: ["entry_id"],
        },
    },
    {
        name: "clear_replay_entry_draft",
        description: "Clear a Replay entry draft",
        input_schema: {
            type: "object",
            properties: {
                entry_id: {
                    type: "string",
                    description: "The Replay entry ID",
                },
                kind: {
                    type: "string",
                    enum: ["HTTP", "WS"],
                    description: "Replay session kind (default: WS)",
                },
            },
            required: ["entry_id"],
        },
    },
    {
        name: "send_websocket_replay_message",
        description: "Send a WebSocket message on a running Replay WS task",
        input_schema: {
            type: "object",
            properties: {
                task_id: {
                    type: "string",
                    description: "The running Replay task ID",
                },
                raw: {
                    type: "string",
                    description: "Raw UTF-8 WebSocket message payload",
                },
                raw_base64: {
                    type: "string",
                    description: "Base64-encoded WebSocket message payload",
                },
                direction: {
                    type: "string",
                    enum: ["CLIENT", "SERVER"],
                    description: "Message direction (default: CLIENT)",
                },
                format: {
                    type: "string",
                    enum: ["TEXT", "BINARY", "CLOSE", "PING", "PONG"],
                    description: "Message format (default: TEXT)",
                },
            },
            required: ["task_id"],
        },
    },
    {
        name: "send_websocket_replay_draft",
        description: "Send the current draft on a running Replay WS task",
        input_schema: {
            type: "object",
            properties: {
                task_id: {
                    type: "string",
                    description: "The running Replay task ID",
                },
            },
            required: ["task_id"],
        },
    },
    {
        name: "stop_websocket_replay_tasks",
        description: "Stop one or more running Replay WS tasks",
        input_schema: {
            type: "object",
            properties: {
                task_ids: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "Replay WS task IDs to stop",
                },
            },
            required: ["task_ids"],
        },
    },
    {
        name: "list_websocket_streams",
        description: "List WebSocket streams with pagination and filtering support",
        input_schema: {
            type: "object",
            properties: {
                limit: {
                    type: "number",
                    description: "Maximum number of streams to retrieve (default: 50)",
                },
                offset: {
                    type: "number",
                    description: "Number of streams to skip for pagination (default: 0)",
                },
                scope_id: {
                    type: "string",
                    description: "Optional scope ID to filter streams",
                },
                filter_code: {
                    type: "string",
                    description: 'Optional StreamQL clause to combine with the WebSocket filter, e.g. stream.host.cont:"example.com"',
                },
                order: {
                    type: "object",
                    description: "Sorting order for streams (default: by ID descending)",
                    properties: {
                        by: {
                            type: "string",
                            description: "Field to sort by (e.g., 'ID', 'CREATED_AT')",
                        },
                        ordering: {
                            type: "string",
                            description: "Sort order ('ASC' or 'DESC')",
                        },
                    },
                },
            },
        },
    },
    {
        name: "get_websocket_message_count",
        description: "Get the total count of messages in a specific WebSocket stream",
        input_schema: {
            type: "object",
            properties: {
                stream_id: {
                    type: "string",
                    description: "The unique ID of the WebSocket stream to get message count for",
                },
            },
            required: ["stream_id"],
        },
    },
    {
        name: "get_websocket_stream",
        description: "Get details for a specific WebSocket or stream by ID",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The unique ID of the stream to retrieve",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "list_websocket_messages",
        description: "List WebSocket messages in a stream with pagination and optional StreamQL filtering",
        input_schema: {
            type: "object",
            properties: {
                stream_id: {
                    type: "string",
                    description: "The unique ID of the WebSocket stream",
                },
                limit: {
                    type: "number",
                    description: "Maximum number of messages to retrieve (default: 50)",
                },
                offset: {
                    type: "number",
                    description: "Number of messages to skip for pagination (default: 0)",
                },
                filter_code: {
                    type: "string",
                    description: 'Optional StreamQL clause for messages, e.g. stream.id.eq:"123"',
                },
                include_raw: {
                    type: "boolean",
                    description: "Whether to include base64 raw payloads (default: false)",
                },
                include_decoded: {
                    type: "boolean",
                    description: "Whether to include decoded text previews when possible (default: true)",
                },
                order: {
                    type: "object",
                    description: "Sorting order for messages (default: ID ascending)",
                    properties: {
                        by: {
                            type: "string",
                            description: "Field to sort by (e.g., 'ID')",
                        },
                        ordering: {
                            type: "string",
                            description: "Sort order ('ASC' or 'DESC')",
                        },
                    },
                },
            },
            required: ["stream_id"],
        },
    },
    {
        name: "get_websocket_message",
        description: "Get detailed information about a specific WebSocket message by its ID",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The unique ID of the WebSocket message to retrieve",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "list_workflows",
        description: "List Caido workflows. Workflow kinds: ACTIVE runs against a request, PASSIVE analyzes traffic, CONVERT transforms bytes/text and can be used by Tamper replacers and Replay preprocessors.",
        input_schema: {
            type: "object",
            properties: {
                kind: {
                    type: "string",
                    description: "Optional workflow kind filter, such as PASSIVE, ACTIVE, or CONVERT",
                },
                enabled: {
                    type: "boolean",
                    description: "Optional enabled state filter",
                },
                include_definition: {
                    type: "boolean",
                    description: "Whether to include full workflow definitions (default: false)",
                },
            },
        },
    },
    {
        name: "get_workflow",
        description: "Get a Caido workflow by ID, including its definition. Use this before cloning/editing workflows or wiring Convert workflows into Tamper/Replay.",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The workflow ID to retrieve",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "list_workflow_node_definitions",
        description: "List available Caido workflow node definitions",
        input_schema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "get_workflow_definition_guide",
        description: "Explain Caido workflow definition JSON shape and list compatible node definitions. Use before creating or editing workflow definitions from scratch.",
        input_schema: {
            type: "object",
            properties: {
                kind: {
                    type: "string",
                    enum: ["CONVERT", "ACTIVE", "PASSIVE"],
                    description: "Optional workflow kind to filter node definitions",
                },
            },
        },
    },
    {
        name: "generate_workflow_template",
        description: "Generate a starter workflow definition JSON for CONVERT, ACTIVE, PASSIVE, or template-specific workflows such as AUTH_CAPTURE. Edit the result, validate with test_*_workflow, then pass it to create_workflow or update_workflow.",
        input_schema: {
            type: "object",
            properties: {
                kind: {
                    type: "string",
                    enum: ["CONVERT", "ACTIVE", "PASSIVE"],
                    description: "Workflow kind for the template (default: CONVERT)",
                },
                name: {
                    type: "string",
                    description: "Workflow name for the template",
                },
                node_definition_id: {
                    type: "string",
                    description: "Optional transform node for CONVERT templates, such as caido/code-js, caido/base64-decode, or caido/url-encode",
                },
                template: {
                    type: "string",
                    enum: ["AUTH_CAPTURE"],
                    description: "Optional specialized template. AUTH_CAPTURE creates a passive JavaScript workflow that saves a matched session/captcha/token to sdk.env.",
                },
                variable_name: {
                    type: "string",
                    description: "Environment variable name for AUTH_CAPTURE templates (default: SESSION_TOKEN)",
                },
                extraction_code: {
                    type: "string",
                    description: "Optional JavaScript snippet for AUTH_CAPTURE. It runs inside run({ request, response, extra }, sdk) and must define const value or let value with the string to save. Useful APIs: request/response.getBody()?.toText(), request.getQuery(), request/response.getHeader(name). In current Caido builds getHeader(name) returns an array, so use header[0] or join it before parsing. Use get_workflow_definition_guide for cookie/header/query examples.",
                },
                extraction_goal: {
                    type: "string",
                    description: "Human-readable goal for the model when generating extraction_code, e.g. 'save PHPSESSID from request Cookie header' or 'save captcha query parameter'. This field is informational; generate_workflow_template uses extraction_code when provided.",
                },
            },
        },
    },
    {
        name: "create_workflow",
        description: "Create a Caido workflow from a complete workflow definition JSON. First use get_workflow_definition_guide or generate_workflow_template; validate with test_active_workflow, test_passive_workflow, or test_convert_workflow before creating.",
        input_schema: {
            type: "object",
            properties: {
                definition: {
                    description: "Complete workflow definition JSON object/string with edition, id, name, kind, graph.nodes, and graph.edges. Use generate_workflow_template for the expected shape.",
                },
                global: {
                    type: "boolean",
                    description: "Whether to create the workflow globally (default: false)",
                },
            },
            required: ["definition"],
        },
    },
    {
        name: "update_workflow",
        description: "Update a Caido workflow definition. Fetch the existing definition with get_workflow, modify it, validate with test_*_workflow, then update.",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The workflow ID to update",
                },
                definition: {
                    description: "Complete replacement workflow definition JSON object/string. Use get_workflow_definition_guide for node/input shape.",
                },
            },
            required: ["id", "definition"],
        },
    },
    {
        name: "rename_workflow",
        description: "Rename a Caido workflow",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The workflow ID to rename",
                },
                name: {
                    type: "string",
                    description: "New workflow name",
                },
            },
            required: ["id", "name"],
        },
    },
    {
        name: "delete_workflow",
        description: "Delete a Caido workflow by ID",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The workflow ID to delete",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "globalize_workflow",
        description: "Move a Caido workflow to global scope",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The workflow ID to globalize",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "localize_workflow",
        description: "Move a Caido workflow to project-local scope",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The workflow ID to localize",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "toggle_workflow",
        description: "Enable or disable a Caido workflow",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The workflow ID to toggle",
                },
                enabled: {
                    type: "boolean",
                    description: "Whether the workflow should be enabled",
                },
            },
            required: ["id", "enabled"],
        },
    },
    {
        name: "run_active_workflow",
        description: "Run an active Caido workflow against a request ID",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The active workflow ID to run",
                },
                request_id: {
                    type: "string",
                    description: "The Caido request ID to run the workflow against",
                },
            },
            required: ["id", "request_id"],
        },
    },
    {
        name: "run_convert_workflow",
        description: "Run a CONVERT workflow against raw text or base64 input. These workflows are also usable as Tamper replacers and Replay placeholder preprocessors.",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The convert workflow ID to run",
                },
                raw: {
                    type: "string",
                    description: "Raw UTF-8 input to pass to the workflow",
                },
                raw_base64: {
                    type: "string",
                    description: "Base64-encoded input to pass to the workflow instead of raw",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "test_active_workflow",
        description: "Test an active workflow definition against raw request data",
        input_schema: {
            type: "object",
            properties: {
                definition: {
                    description: "Workflow definition as a JSON object or JSON string",
                },
                request_raw: {
                    type: "string",
                    description: "Raw UTF-8 request to test",
                },
                request_raw_base64: {
                    type: "string",
                    description: "Base64-encoded raw request to test",
                },
                response_raw: {
                    type: "string",
                    description: "Optional raw UTF-8 response",
                },
                response_raw_base64: {
                    type: "string",
                    description: "Optional base64-encoded raw response",
                },
                connection: {
                    type: "object",
                    description: "Connection info for request_raw",
                    properties: {
                        host: { type: "string" },
                        port: { type: "number" },
                        isTLS: { type: "boolean" },
                        SNI: { type: "string" },
                    },
                },
            },
            required: ["definition"],
        },
    },
    {
        name: "test_passive_workflow",
        description: "Test a passive workflow definition against raw request data",
        input_schema: {
            type: "object",
            properties: {
                definition: {
                    description: "Workflow definition as a JSON object or JSON string",
                },
                request_raw: {
                    type: "string",
                    description: "Raw UTF-8 request to test",
                },
                request_raw_base64: {
                    type: "string",
                    description: "Base64-encoded raw request to test",
                },
                response_raw: {
                    type: "string",
                    description: "Optional raw UTF-8 response",
                },
                response_raw_base64: {
                    type: "string",
                    description: "Optional base64-encoded raw response",
                },
                connection: {
                    type: "object",
                    description: "Connection info for request_raw",
                    properties: {
                        host: { type: "string" },
                        port: { type: "number" },
                        isTLS: { type: "boolean" },
                        SNI: { type: "string" },
                    },
                },
            },
            required: ["definition"],
        },
    },
    {
        name: "test_convert_workflow",
        description: "Test a convert workflow definition against raw input",
        input_schema: {
            type: "object",
            properties: {
                definition: {
                    description: "Workflow definition as a JSON object or JSON string",
                },
                raw: {
                    type: "string",
                    description: "Raw UTF-8 input to test",
                },
                raw_base64: {
                    type: "string",
                    description: "Base64-encoded input to test",
                },
            },
            required: ["definition"],
        },
    },
    {
        name: "list_filter_presets",
        description: "List all available filter presets in Caido",
        input_schema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "create_filter_preset",
        description: "Create a new filter preset with custom HTTPQL clause",
        input_schema: {
            type: "object",
            properties: {
                alias: {
                    type: "string",
                    description: "Unique alias for the filter preset",
                },
                name: {
                    type: "string",
                    description: "Display name for the filter preset",
                },
                clause: {
                    type: "string",
                    description: "HTTPQL clause for filtering requests (optional)",
                },
            },
            required: ["alias", "name"],
        },
    },
    {
        name: "update_filter_preset",
        description: "Update an existing filter preset with new values",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The ID of the filter preset to update",
                },
                alias: {
                    type: "string",
                    description: "New alias for the filter preset (optional)",
                },
                name: {
                    type: "string",
                    description: "New display name for the filter preset (optional)",
                },
                clause: {
                    type: "string",
                    description: "New HTTPQL clause for filtering requests (optional)",
                },
            },
            required: ["id", "name", "clause", "alias"],
        },
    },
    {
        name: "delete_filter_preset",
        description: "Delete a filter preset by its ID",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The ID of the filter preset to delete",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "list_scopes",
        description: "List all available scopes in Caido",
        input_schema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "create_scope",
        description: "Create a new scope with allowlist and denylist",
        input_schema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name of the scope",
                },
                allowlist: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "List of allowed domains/hosts (optional). Supports *.domain",
                },
                denylist: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "List of denied domains/hosts (optional)",
                },
                indexed: {
                    type: "boolean",
                    description: "Whether the scope should be indexed (default: true)",
                },
            },
            required: ["name"],
        },
    },
    {
        name: "update_scope",
        description: "Update an existing scope with new values",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The ID of the scope to update",
                },
                name: {
                    type: "string",
                    description: "New name for the scope (optional)",
                },
                allowlist: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "New allowlist for the scope (optional)",
                },
                denylist: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "New denylist for the scope (optional)",
                },
            },
            required: ["id", "name", "allowlist", "denylist"],
        },
    },
    {
        name: "delete_scope",
        description: "Delete a scope by its ID",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The ID of the scope to delete",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "get_tools_version",
        description: "Get the current version of backend tools and API",
        input_schema: {
            type: "object",
            properties: {},
        },
    },
];
