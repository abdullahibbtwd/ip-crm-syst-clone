import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RolesGuard } from './roles.guard';

function mockContext(user?: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('Guards', () => {
  describe('JwtAuthGuard', () => {
    const reflector = { getAllAndOverride: jest.fn() };
    const guard = new JwtAuthGuard(reflector as unknown as Reflector);

    beforeEach(() => {
      jest.clearAllMocks();
      reflector.getAllAndOverride.mockReset();
    });

    it('allows public routes', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      expect(guard.canActivate(mockContext())).toBe(true);
    });

    it('handleRequest throws without user', () => {
      expect(() => guard.handleRequest(null, false)).toThrow(
        UnauthorizedException,
      );
    });

    it('handleRequest returns user', () => {
      expect(guard.handleRequest(null, { id: 'u1' })).toEqual({ id: 'u1' });
    });
  });

  describe('PermissionsGuard', () => {
    const reflector = { getAllAndOverride: jest.fn() };
    const guard = new PermissionsGuard(reflector as unknown as Reflector);

    beforeEach(() => {
      jest.clearAllMocks();
      reflector.getAllAndOverride.mockReset();
    });

    it('allows public routes', () => {
      reflector.getAllAndOverride.mockImplementation((key: unknown) =>
        key === IS_PUBLIC_KEY ? true : undefined,
      );
      expect(guard.canActivate(mockContext())).toBe(true);
    });

    it('allows when no permissions required', () => {
      reflector.getAllAndOverride.mockImplementation((key: unknown) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return [];
        return undefined;
      });
      expect(guard.canActivate(mockContext())).toBe(true);
    });

    it('requires authenticated user with permissions', () => {
      reflector.getAllAndOverride.mockImplementation((key: unknown) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === PERMISSIONS_KEY) return ['matter:read'];
        return undefined;
      });

      expect(() => guard.canActivate(mockContext())).toThrow(
        ForbiddenException,
      );
      expect(() =>
        guard.canActivate(mockContext({ permissions: ['matter:update'] })),
      ).toThrow(ForbiddenException);
      expect(
        guard.canActivate(
          mockContext({ permissions: ['matter:read', 'matter:update'] }),
        ),
      ).toBe(true);
    });
  });

  describe('RolesGuard', () => {
    const reflector = { getAllAndOverride: jest.fn() };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    beforeEach(() => {
      jest.clearAllMocks();
      reflector.getAllAndOverride.mockReset();
    });

    it('allows when role matches', () => {
      reflector.getAllAndOverride.mockImplementation((key: unknown) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === ROLES_KEY) return ['managing_partner'];
        return undefined;
      });
      expect(
        guard.canActivate(mockContext({ roles: ['managing_partner'] })),
      ).toBe(true);
    });

    it('rejects missing role', () => {
      reflector.getAllAndOverride.mockImplementation((key: unknown) => {
        if (key === IS_PUBLIC_KEY) return false;
        if (key === ROLES_KEY) return ['managing_partner'];
        return undefined;
      });
      expect(() =>
        guard.canActivate(mockContext({ roles: ['ip_attorney'] })),
      ).toThrow(ForbiddenException);
    });
  });
});
