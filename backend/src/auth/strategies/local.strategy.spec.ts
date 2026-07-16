import { LocalStrategy } from './local.strategy';
import type { AuthService } from '../auth.service';

describe('LocalStrategy', () => {
  it('validate forwards to AuthService.validateUser', async () => {
    const authService = {
      validateUser: jest.fn().mockResolvedValue({ id: 'u1' }),
    };
    const strategy = new LocalStrategy(authService as unknown as AuthService);
    await expect(strategy.validate('a@x.com', 'pw')).resolves.toEqual({
      id: 'u1',
    });
    expect(authService.validateUser).toHaveBeenCalledWith('a@x.com', 'pw');
  });
});
