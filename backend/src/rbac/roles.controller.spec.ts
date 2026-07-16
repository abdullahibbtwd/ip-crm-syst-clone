import { RolesController } from './roles.controller';
import type { RolesService } from './roles.service';

describe('RolesController', () => {
  const roles = { listMatrix: jest.fn() };
  const controller = new RolesController(roles as unknown as RolesService);

  it('list forwards to listMatrix', async () => {
    roles.listMatrix.mockResolvedValue({ roles: [] });
    await expect(controller.list()).resolves.toEqual({ roles: [] });
    expect(roles.listMatrix).toHaveBeenCalled();
  });
});
