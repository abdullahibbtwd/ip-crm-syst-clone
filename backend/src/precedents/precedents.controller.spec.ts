import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrecedentsController } from './precedents.controller';
import type { PrecedentsService } from './precedents.service';

describe('PrecedentsController', () => {
  const precedents = {
    list: jest.fn(),
    fromCorrespondence: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    publish: jest.fn(),
    archive: jest.fn(),
    delete: jest.fn(),
  };

  const controller = new PrecedentsController(
    precedents as unknown as PrecedentsService,
  );

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('list forwards query and user', async () => {
    const query = { limit: 10 };
    await controller.list(query as never, req);
    expect(precedents.list).toHaveBeenCalledWith(query, user);
  });

  it('fromCorrespondence forwards correspondenceId, body, and user', async () => {
    const body = { title: 'Harvested' };
    await controller.fromCorrespondence('corr1', body as never, req);
    expect(precedents.fromCorrespondence).toHaveBeenCalledWith(
      'corr1',
      body,
      user,
    );
  });

  it('get forwards id and user', async () => {
    await controller.get('p1', req);
    expect(precedents.get).toHaveBeenCalledWith('p1', user);
  });

  it('create forwards body and user', async () => {
    const body = { title: 'New', category: 'cat', bodyHtml: '<p>x</p>' };
    await controller.create(body as never, req);
    expect(precedents.create).toHaveBeenCalledWith(body, user);
  });

  it('update forwards id, body, and user', async () => {
    const body = { title: 'Updated' };
    await controller.update('p1', body as never, req);
    expect(precedents.update).toHaveBeenCalledWith('p1', body, user);
  });

  it('publish forwards id and user', async () => {
    await controller.publish('p1', req);
    expect(precedents.publish).toHaveBeenCalledWith('p1', user);
  });

  it('archive forwards id and user', async () => {
    await controller.archive('p1', req);
    expect(precedents.archive).toHaveBeenCalledWith('p1', user);
  });

  it('remove forwards id and user', async () => {
    await controller.remove('p1', req);
    expect(precedents.delete).toHaveBeenCalledWith('p1', user);
  });
});
