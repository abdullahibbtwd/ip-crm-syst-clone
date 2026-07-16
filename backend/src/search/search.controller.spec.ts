import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SearchController } from './search.controller';
import type { SearchService } from './search.service';

describe('SearchController', () => {
  const search = { search: jest.fn() };
  const controller = new SearchController(search as unknown as SearchService);

  it('forwards q and user (defaults empty q)', async () => {
    const user = { userId: 'u1' } as AuthenticatedUser;
    const req = { user } as Request;
    search.search.mockResolvedValue({ query: '', results: [] });

    await controller.query(undefined, req);
    await controller.query('acme', req);

    expect(search.search).toHaveBeenNthCalledWith(1, '', user);
    expect(search.search).toHaveBeenNthCalledWith(2, 'acme', user);
  });
});
