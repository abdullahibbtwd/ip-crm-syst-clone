import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CustomsController } from './customs.controller';
import type { CustomsService } from './customs.service';

describe('CustomsController', () => {
  const customs = {
    listSeizures: jest.fn(),
    createSeizure: jest.fn(),
    getSeizure: jest.fn(),
    updateSeizure: jest.fn(),
    addCustody: jest.fn(),
    listApplications: jest.fn(),
    createApplication: jest.fn(),
    updateApplication: jest.fn(),
  };

  const controller = new CustomsController(
    customs as unknown as CustomsService,
  );

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;
  const matterId = '11111111-1111-1111-1111-111111111111';
  const seizureId = '22222222-2222-2222-2222-222222222222';
  const applicationId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => jest.clearAllMocks());

  it('seizure endpoints forward args', async () => {
    const createDto = { description: 'seized goods' };
    const updateDto = { status: 'released' };
    const custodyDto = { location: 'warehouse' };

    await controller.listSeizures(matterId);
    await controller.createSeizure(matterId, createDto as never, req);
    await controller.getSeizure(seizureId);
    await controller.updateSeizure(seizureId, updateDto as never);
    await controller.addCustody(seizureId, custodyDto as never, req);

    expect(customs.listSeizures).toHaveBeenCalledWith(matterId);
    expect(customs.createSeizure).toHaveBeenCalledWith(
      matterId,
      createDto,
      'u1',
    );
    expect(customs.getSeizure).toHaveBeenCalledWith(seizureId);
    expect(customs.updateSeizure).toHaveBeenCalledWith(seizureId, updateDto);
    expect(customs.addCustody).toHaveBeenCalledWith(
      seizureId,
      custodyDto,
      'u1',
    );
  });

  it('application endpoints forward args', async () => {
    const createDto = { type: 'AFA' };
    const updateDto = { status: 'filed' };

    await controller.listApplications(matterId);
    await controller.createApplication(matterId, createDto as never, req);
    await controller.updateApplication(applicationId, updateDto as never);

    expect(customs.listApplications).toHaveBeenCalledWith(matterId);
    expect(customs.createApplication).toHaveBeenCalledWith(
      matterId,
      createDto,
      'u1',
    );
    expect(customs.updateApplication).toHaveBeenCalledWith(
      applicationId,
      updateDto,
    );
  });
});
