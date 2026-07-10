import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PortalAccessService } from '../common/portal-access.service';
import { CorrespondenceService } from '../correspondence/correspondence.service';
import { DeadlinesService } from '../deadlines/deadlines.service';
import { OutboundEmailService } from '../email-integration/outbound-email.service';
import { MattersService } from '../matters/matters.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { MCP_TOOLS, type McpToolDefinition } from './mcp-tools.config';

@Injectable()
export class McpService {
  constructor(
    private readonly deadlines: DeadlinesService,
    private readonly correspondence: CorrespondenceService,
    private readonly matters: MattersService,
    private readonly outbound: OutboundEmailService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  listToolsForUser(user: AuthenticatedUser): McpToolDefinition[] {
    const permissions = new Set(user.permissions ?? []);
    return MCP_TOOLS.filter((tool) => permissions.has(tool.permission)).map(
      (tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        permission: tool.permission,
      }),
    );
  }

  async callTool(
    toolName: string,
    parameters: Record<string, unknown>,
    user: AuthenticatedUser,
  ): Promise<{ result: unknown }> {
    const tool = MCP_TOOLS.find((t) => t.name === toolName);
    if (!tool) {
      throw new NotFoundException(`Unknown MCP tool: ${toolName}`);
    }

    if (!(user.permissions ?? []).includes(tool.permission)) {
      throw new ForbiddenException(
        `Missing permission ${tool.permission} for tool ${toolName}`,
      );
    }

    switch (toolName) {
      case 'get_matter_deadlines':
        return {
          result: await this.getMatterDeadlines(parameters, user),
        };
      case 'list_correspondence':
        return {
          result: await this.listCorrespondence(parameters, user),
        };
      case 'get_matter_detail':
        return {
          result: await this.getMatterDetail(parameters, user),
        };
      case 'generate_draft_reply':
        return {
          result: await this.generateDraftReply(parameters, user),
        };
      default:
        throw new NotFoundException(`Unhandled MCP tool: ${toolName}`);
    }
  }

  private requireMatterId(parameters: Record<string, unknown>): string {
    const matterId = parameters.matterId;
    if (typeof matterId !== 'string' || !matterId.trim()) {
      throw new BadRequestException('matterId is required');
    }
    return matterId.trim();
  }

  private async getMatterDeadlines(
    parameters: Record<string, unknown>,
    user: AuthenticatedUser,
  ) {
    const matterId = this.requireMatterId(parameters);
    await this.portalAccess.assertMatterAccess(matterId, user);

    const deadlines = await this.deadlines.getActiveByMatterId(matterId);

    const isGatekeeper =
      user.roles.includes(SYSTEM_ROLES.MANAGING_PARTNER) ||
      user.roles.includes(SYSTEM_ROLES.DOCKETING_ADMIN) ||
      user.roles.includes(SYSTEM_ROLES.COORDINATOR);

    if (isGatekeeper || this.portalAccess.isPortalClient(user)) {
      return deadlines;
    }

    // Attorneys / paralegals: only deadlines assigned to them on this matter
    return deadlines.filter((d) => d.assignedToId === user.userId);
  }

  private async listCorrespondence(
    parameters: Record<string, unknown>,
    user: AuthenticatedUser,
  ) {
    const matterId = this.requireMatterId(parameters);
    await this.portalAccess.assertMatterAccess(matterId, user);
    const rows = await this.correspondence.listForMatter(matterId);

    if (this.portalAccess.isPortalClient(user)) {
      return rows.filter((r) => r.isClientVisible);
    }
    return rows;
  }

  private async getMatterDetail(
    parameters: Record<string, unknown>,
    user: AuthenticatedUser,
  ) {
    const matterId = this.requireMatterId(parameters);
    return this.matters.findOne(matterId, user);
  }

  private async generateDraftReply(
    parameters: Record<string, unknown>,
    _user: AuthenticatedUser,
  ) {
    const matterId = this.requireMatterId(parameters);
    await this.portalAccess.assertMatterAccess(matterId, _user);

    const correspondenceId =
      typeof parameters.correspondenceId === 'string'
        ? parameters.correspondenceId
        : undefined;
    const unlinkedEmailId =
      typeof parameters.unlinkedEmailId === 'string'
        ? parameters.unlinkedEmailId
        : undefined;

    if (!correspondenceId && !unlinkedEmailId) {
      throw new BadRequestException(
        'correspondenceId or unlinkedEmailId is required',
      );
    }

    return this.outbound.buildDraftReply({
      matterId,
      correspondenceId,
      unlinkedEmailId,
      useAi: true,
    });
  }
}
