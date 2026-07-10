export const MCP_MODULE = 'mcp';

export type McpToolInputSchema = {
  type: 'object';
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
};

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
  /** Permission key required to list/call this tool (e.g. deadline:read). */
  permission: string;
};

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'get_matter_deadlines',
    description: 'Retrieve all active deadlines for a specific matter',
    inputSchema: {
      type: 'object',
      properties: {
        matterId: {
          type: 'string',
          description: 'Matter UUID',
        },
      },
      required: ['matterId'],
    },
    permission: 'deadline:read',
  },
  {
    name: 'list_correspondence',
    description: 'List correspondence for a matter (portal users are scoped to their client)',
    inputSchema: {
      type: 'object',
      properties: {
        matterId: {
          type: 'string',
          description: 'Matter UUID',
        },
      },
      required: ['matterId'],
    },
    permission: 'correspondence:read',
  },
  {
    name: 'get_matter_detail',
    description: 'Retrieve matter detail including client, jurisdictions, and assignment',
    inputSchema: {
      type: 'object',
      properties: {
        matterId: {
          type: 'string',
          description: 'Matter UUID',
        },
      },
      required: ['matterId'],
    },
    permission: 'matter:read',
  },
  {
    name: 'generate_draft_reply',
    description:
      'Generate an AI draft reply for a matter email. Does not send — review and send via the outbound email API.',
    inputSchema: {
      type: 'object',
      properties: {
        matterId: {
          type: 'string',
          description: 'Matter UUID',
        },
        correspondenceId: {
          type: 'string',
          description: 'Incoming correspondence UUID to reply to',
        },
        unlinkedEmailId: {
          type: 'string',
          description: 'Queued unlinked email UUID to reply to',
        },
      },
      required: ['matterId'],
    },
    permission: 'email:create',
  },
];
