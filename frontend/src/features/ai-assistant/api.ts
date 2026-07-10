import { apiClient } from '@/lib/api-client'

export type McpToolInputSchema = {
  type: 'object'
  properties: Record<string, { type: string; description?: string }>
  required?: string[]
}

export type McpToolDefinition = {
  name: string
  description: string
  inputSchema: McpToolInputSchema
  permission: string
}

export type McpListToolsResponse = {
  tools: McpToolDefinition[]
}

export type McpCallToolResponse = {
  result: unknown
}

export const mcpApi = {
  listTools: () => apiClient.post<McpListToolsResponse>('/mcp/tools/list'),

  callTool: (toolName: string, parameters: Record<string, unknown>) =>
    apiClient.post<McpCallToolResponse>('/mcp/tools/call', {
      toolName,
      parameters,
    }),
}
