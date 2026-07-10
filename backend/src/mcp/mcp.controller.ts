import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { MCP_MODULE } from './mcp-tools.config';
import { McpCallToolDto } from './dto/mcp-call.dto';
import { McpService } from './mcp.service';

@Controller('mcp')
@RequirePermissions('mcp:read')
@Audit({ action: 'mcp', resource: 'mcp', module: MCP_MODULE })
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @Post('tools/list')
  listTools(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return { tools: this.mcp.listToolsForUser(user) };
  }

  @Post('tools/call')
  @RequirePermissions('mcp:create')
  @Audit({ action: 'mcp_call', resource: 'mcp', module: MCP_MODULE })
  callTool(@Body() dto: McpCallToolDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.mcp.callTool(dto.toolName, dto.parameters ?? {}, user);
  }
}
