import type { Request } from 'express';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { OfficesController } from './offices.controller';
import type { OfficesService } from './offices.service';

describe('OfficesController', () => {
  const officesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new OfficesController(
    officesService as unknown as OfficesService,
  );
  const req = {
    user: { userId: 'u1' } as AuthenticatedUser,
  } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('create forwards clientId, dto, userId', async () => {
    const dto = { name: 'HQ' };
    await controller.create('c1', dto as never, req);
    expect(officesService.create).toHaveBeenCalledWith('c1', dto, 'u1');
  });

  it('findAll / remove forward ids', async () => {
    await controller.findAll('c1');
    await controller.remove('c1', 'o1');
    expect(officesService.findAll).toHaveBeenCalledWith('c1');
    expect(officesService.remove).toHaveBeenCalledWith('c1', 'o1');
  });

  it('update forwards ids, dto, userId', async () => {
    const dto = { name: 'Branch' };
    await controller.update('c1', 'o1', dto as never, req);
    expect(officesService.update).toHaveBeenCalledWith('c1', 'o1', dto, 'u1');
  });
});
