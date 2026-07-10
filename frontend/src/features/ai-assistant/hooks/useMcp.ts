import { useMutation, useQuery } from '@tanstack/react-query'
import { mcpApi } from '../api'

export const mcpKeys = {
  all: ['mcp'] as const,
  tools: () => [...mcpKeys.all, 'tools'] as const,
}

export function useMcpTools(enabled: boolean) {
  return useQuery({
    queryKey: mcpKeys.tools(),
    queryFn: () => mcpApi.listTools(),
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useMcpCallTool() {
  return useMutation({
    mutationFn: ({
      toolName,
      parameters,
    }: {
      toolName: string
      parameters: Record<string, unknown>
    }) => mcpApi.callTool(toolName, parameters),
  })
}
