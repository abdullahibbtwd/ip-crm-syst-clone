import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { IpRightsController } from './ip-rights.controller';
import type { IpRightsService } from './ip-rights.service';

describe('IpRightsController', () => {
  const ipRights = { list: jest.fn() };
  const controller = new IpRightsController(
    ipRights as unknown as IpRightsService,
  );

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('list forwards user and query', async () => {
    const query = { matterId: 'm1', limit: 20 };
    await controller.list(query as never, req);
    expect(ipRights.list).toHaveBeenCalledWith(user, query);
  });
});
