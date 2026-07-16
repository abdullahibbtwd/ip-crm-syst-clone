import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { AuthService } from '../auth/auth.service';
import { UsersController } from './users.controller';
import type { UsersService } from './users.service';

describe('UsersController', () => {
  const usersService = {
    findAll: jest.fn(),
    listAttorneyAssignees: jest.fn(),
    listTeamMembers: jest.fn(),
    invite: jest.fn(),
    updateRole: jest.fn(),
  };
  const authService = { resetUserMfa: jest.fn() };

  const controller = new UsersController(
    usersService as unknown as UsersService,
    authService as unknown as AuthService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('forwards list / invite / role / mfa reset', async () => {
    const req = {
      user: { userId: 'actor' } as AuthenticatedUser,
    } as Request;

    await controller.findAll({ search: 'a' } as never);
    await controller.listAttorneyAssignees();
    await controller.listTeamMembers();
    await controller.listDeadlineAssignees();
    await controller.invite({ email: 'x@y.com' } as never);
    await controller.updateRole('u1', { role: 'ip_attorney' } as never, req);
    await controller.resetMfa('u1');

    expect(usersService.findAll).toHaveBeenCalledWith({ search: 'a' });
    expect(usersService.listAttorneyAssignees).toHaveBeenCalled();
    expect(usersService.listTeamMembers).toHaveBeenCalledTimes(2);
    expect(usersService.invite).toHaveBeenCalled();
    expect(usersService.updateRole).toHaveBeenCalledWith(
      'u1',
      { role: 'ip_attorney' },
      'actor',
    );
    expect(authService.resetUserMfa).toHaveBeenCalledWith('u1');
  });
});
