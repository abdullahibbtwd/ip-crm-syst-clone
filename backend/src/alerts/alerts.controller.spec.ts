import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AlertsController } from './alerts.controller';
import type { AlertsService } from './alerts.service';

describe('AlertsController', () => {
  const alerts = { getSummary: jest.fn() };
  const controller = new AlertsController(alerts as unknown as AlertsService);

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('summary forwards user', async () => {
    await controller.summary(req);
    expect(alerts.getSummary).toHaveBeenCalledWith(user);
  });
});
