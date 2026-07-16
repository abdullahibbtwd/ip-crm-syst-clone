import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PortalAccessService } from '../common/portal-access.service';
import type { CorrespondenceService } from '../correspondence/correspondence.service';
import type { DeadlinesService } from '../deadlines/deadlines.service';
import type { MattersService } from '../matters/matters.service';
import type { OutboundEmailService } from '../email-integration/outbound-email.service';
import { McpService } from './mcp.service';

describe('McpService', () => {
  const deadlines = { getActiveByMatterId: jest.fn() };
  const correspondence = { listForMatter: jest.fn() };
  const matters = { findOne: jest.fn() };
  const outbound = { buildDraftReply: jest.fn() };
  const portalAccess = {
    assertMatterAccess: jest.fn(),
    isPortalClient: jest.fn(),
  };

  const service = new McpService(
    deadlines as unknown as DeadlinesService,
    correspondence as unknown as CorrespondenceService,
    matters as unknown as MattersService,
    outbound as unknown as OutboundEmailService,
    portalAccess as unknown as PortalAccessService,
  );

  const attorney = {
    userId: 'u1',
    roles: [SYSTEM_ROLES.IP_ATTORNEY],
    permissions: [
      'deadline:read',
      'correspondence:read',
      'matter:read',
      'correspondence:create',
    ],
  } as AuthenticatedUser;

  beforeEach(() => {
    jest.clearAllMocks();
    portalAccess.assertMatterAccess.mockResolvedValue(undefined);
    portalAccess.isPortalClient.mockReturnValue(false);
  });

  it('listToolsForUser filters by permissions', () => {
    const tools = service.listToolsForUser({
      ...attorney,
      permissions: ['deadline:read', 'matter:read'],
    });
    expect(tools.map((t) => t.name)).toEqual([
      'get_matter_deadlines',
      'get_matter_detail',
    ]);
  });

  it('callTool rejects unknown tools', async () => {
    await expect(
      service.callTool('missing', {}, attorney),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('callTool rejects missing permission', async () => {
    await expect(
      service.callTool(
        'get_matter_deadlines',
        { matterId: 'm1' },
        { ...attorney, permissions: [] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('get_matter_deadlines returns all for gatekeepers', async () => {
    const rows = [{ id: 'd1', assignedToId: 'other' }];
    deadlines.getActiveByMatterId.mockResolvedValue(rows);

    const result = await service.callTool(
      'get_matter_deadlines',
      { matterId: 'm1' },
      {
        ...attorney,
        roles: [SYSTEM_ROLES.MANAGING_PARTNER],
        permissions: ['deadline:read'],
      },
    );

    expect(portalAccess.assertMatterAccess).toHaveBeenCalledWith('m1', expect.anything());
    expect(result.result).toEqual(rows);
  });

  it('get_matter_deadlines filters to assigned attorney', async () => {
    deadlines.getActiveByMatterId.mockResolvedValue([
      { id: 'd1', assignedToId: 'u1' },
      { id: 'd2', assignedToId: 'other' },
    ]);

    const result = await service.callTool(
      'get_matter_deadlines',
      { matterId: 'm1' },
      { ...attorney, permissions: ['deadline:read'] },
    );

    expect(result.result).toEqual([{ id: 'd1', assignedToId: 'u1' }]);
  });

  it('list_correspondence hides non-client-visible rows for portal users', async () => {
    portalAccess.isPortalClient.mockReturnValue(true);
    correspondence.listForMatter.mockResolvedValue([
      { id: 'c1', isClientVisible: true },
      { id: 'c2', isClientVisible: false },
    ]);

    const result = await service.callTool(
      'list_correspondence',
      { matterId: 'm1' },
      {
        ...attorney,
        roles: [SYSTEM_ROLES.PORTAL_CLIENT],
        permissions: ['correspondence:read'],
      },
    );

    expect(result.result).toEqual([{ id: 'c1', isClientVisible: true }]);
  });

  it('get_matter_detail delegates to matters service', async () => {
    matters.findOne.mockResolvedValue({ id: 'm1', title: 'Matter' });
    const result = await service.callTool(
      'get_matter_detail',
      { matterId: 'm1' },
      { ...attorney, permissions: ['matter:read'] },
    );
    expect(matters.findOne).toHaveBeenCalledWith('m1', expect.anything());
    expect(result.result).toEqual({ id: 'm1', title: 'Matter' });
  });

  it('generate_draft_reply requires correspondence or unlinked id', async () => {
    await expect(
      service.callTool(
        'generate_draft_reply',
        { matterId: 'm1' },
        { ...attorney, permissions: ['email:create'] },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('generate_draft_reply builds draft via outbound service', async () => {
    outbound.buildDraftReply.mockResolvedValue({ subject: 'Re:', body: 'Hi' });
    const result = await service.callTool(
      'generate_draft_reply',
      { matterId: 'm1', correspondenceId: 'corr1' },
      { ...attorney, permissions: ['email:create'] },
    );
    expect(outbound.buildDraftReply).toHaveBeenCalledWith({
      matterId: 'm1',
      correspondenceId: 'corr1',
      unlinkedEmailId: undefined,
      useAi: true,
    });
    expect(result.result).toEqual({ subject: 'Re:', body: 'Hi' });
  });

  it('requires matterId for tool calls', async () => {
    await expect(
      service.callTool(
        'get_matter_deadlines',
        {},
        { ...attorney, permissions: ['deadline:read'] },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
