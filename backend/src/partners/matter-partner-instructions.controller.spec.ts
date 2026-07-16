import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PortalAccessService } from '../common/portal-access.service';
import { MatterPartnerInstructionsController } from './matter-partner-instructions.controller';
import type { PartnerInstructionsService } from './partner-instructions.service';

describe('MatterPartnerInstructionsController', () => {
  const instructions = {
    listForMatter: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    transition: jest.fn(),
  };
  const portalAccess = { assertMatterAccess: jest.fn() };

  const controller = new MatterPartnerInstructionsController(
    instructions as unknown as PartnerInstructionsService,
    portalAccess as unknown as PortalAccessService,
  );

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    portalAccess.assertMatterAccess.mockResolvedValue(undefined);
  });

  it('list asserts access and forwards matterId and query', async () => {
    const query = { status: 'draft' };
    await controller.list('m1', query as never, req);
    expect(portalAccess.assertMatterAccess).toHaveBeenCalledWith('m1', user);
    expect(instructions.listForMatter).toHaveBeenCalledWith('m1', query);
  });

  it('create asserts access and forwards matterId, dto, and userId', async () => {
    const dto = { partnerId: 'p1', instructions: 'file' };
    await controller.create('m1', dto as never, req);
    expect(portalAccess.assertMatterAccess).toHaveBeenCalledWith('m1', user);
    expect(instructions.create).toHaveBeenCalledWith('m1', dto, 'u1');
  });

  it('update asserts access and forwards matterId, id, and dto', async () => {
    const dto = { instructions: 'updated' };
    await controller.update('m1', 'i1', dto as never, req);
    expect(portalAccess.assertMatterAccess).toHaveBeenCalledWith('m1', user);
    expect(instructions.update).toHaveBeenCalledWith('m1', 'i1', dto);
  });

  it('transition asserts access and forwards status', async () => {
    const dto = { status: 'submitted' };
    await controller.transition('m1', 'i1', dto as never, req);
    expect(portalAccess.assertMatterAccess).toHaveBeenCalledWith('m1', user);
    expect(instructions.transition).toHaveBeenCalledWith(
      'm1',
      'i1',
      'submitted',
    );
  });
});
