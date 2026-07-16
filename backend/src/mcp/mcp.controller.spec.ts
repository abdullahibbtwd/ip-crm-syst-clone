import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { McpController } from './mcp.controller';
import type { McpService } from './mcp.service';

describe('McpController', () => {
  const mcp = {
    listToolsForUser: jest.fn(),
    callTool: jest.fn(),
  };
  const controller = new McpController(mcp as unknown as McpService);
  const user = {
    userId: 'u1',
    permissions: ['mcp:read', 'mcp:create'],
  } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('listTools returns tools for user', () => {
    mcp.listToolsForUser.mockReturnValue([{ name: 'get_matter_detail' }]);
    expect(controller.listTools(req)).toEqual({
      tools: [{ name: 'get_matter_detail' }],
    });
    expect(mcp.listToolsForUser).toHaveBeenCalledWith(user);
  });

  it('callTool forwards dto and user', async () => {
    mcp.callTool.mockResolvedValue({ result: { ok: true } });
    const dto = { toolName: 'get_matter_detail', parameters: { matterId: 'm1' } };
    await expect(controller.callTool(dto, req)).resolves.toEqual({
      result: { ok: true },
    });
    expect(mcp.callTool).toHaveBeenCalledWith(
      'get_matter_detail',
      { matterId: 'm1' },
      user,
    );
  });

  it('callTool defaults parameters to empty object', async () => {
    mcp.callTool.mockResolvedValue({ result: null });
    await controller.callTool({ toolName: 'get_matter_detail' } as never, req);
    expect(mcp.callTool).toHaveBeenCalledWith(
      'get_matter_detail',
      {},
      user,
    );
  });
});
