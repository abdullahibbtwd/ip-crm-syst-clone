import type { Request } from 'express';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { RelatedCompaniesController } from './related-companies.controller';
import type { RelatedCompaniesService } from './related-companies.service';

describe('RelatedCompaniesController', () => {
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new RelatedCompaniesController(
    service as unknown as RelatedCompaniesService,
  );
  const req = {
    user: { userId: 'u1' } as AuthenticatedUser,
  } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('create / findAll / remove forward args', async () => {
    const dto = { relatedClientId: 'c2' };
    await controller.create('c1', dto as never, req);
    await controller.findAll('c1');
    await controller.remove('c1', 'r1');

    expect(service.create).toHaveBeenCalledWith('c1', dto, 'u1');
    expect(service.findAll).toHaveBeenCalledWith('c1');
    expect(service.remove).toHaveBeenCalledWith('c1', 'r1');
  });
});
