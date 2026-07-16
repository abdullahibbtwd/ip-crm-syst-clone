import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { verify } from 'otplib';
import { AuthService } from './auth.service';
import type { UserWithAccess } from './user-access';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('otplib', () => ({
  verify: jest.fn(),
  generateSecret: jest.fn(() => 'RAW-MFA-SECRET'),
  generateURI: jest.fn(({ label }: { label: string }) => `otpauth://totp/${label}`),
}));

function accessUser(overrides: Record<string, unknown> = {}): UserWithAccess {
  return {
    id: 'u1',
    email: 'ada@example.com',
    fullName: 'Ada Lovelace',
    passwordHash: 'hashed',
    isActive: true,
    mfaEnabled: false,
    mfaSecret: null,
    clientId: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    userRoles: [
      {
        role: {
          name: 'ip_attorney',
          rolePermissions: [
            { permission: { resource: 'matter', action: 'read' } },
          ],
        },
      },
    ],
    ...overrides,
  } as unknown as UserWithAccess;
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: Record<string, any>;
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let config: { get: jest.Mock; getOrThrow: jest.Mock };
  let mfaSecret: { encrypt: jest.Mock; decrypt: jest.Mock };
  let mfaPolicy: { requiresMfaEnrollment: jest.Mock };
  let email: { send: jest.Mock };
  let clientsService: { createInTransaction: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      role: { findUniqueOrThrow: jest.fn() },
      userRole: { create: jest.fn() },
      contact: { create: jest.fn() },
      relationshipHistory: { create: jest.fn() },
      refreshToken: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      passwordResetToken: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      mfaBackupCode: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (ops: unknown) => {
        if (typeof ops === 'function') return (ops as (tx: unknown) => unknown)(prisma);
        return Promise.all(ops as Promise<unknown>[]);
      }),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('access-jwt'),
      verifyAsync: jest.fn(),
    };
    config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:5173';
        if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return fallback;
      }),
      getOrThrow: jest.fn().mockReturnValue('secret'),
    };
    mfaSecret = {
      encrypt: jest.fn((s: string) => `enc:${s}`),
      decrypt: jest.fn((s: string) => s.replace(/^enc:/, '')),
    };
    mfaPolicy = { requiresMfaEnrollment: jest.fn().mockResolvedValue(false) };
    email = { send: jest.fn().mockResolvedValue(undefined) };
    clientsService = {
      createInTransaction: jest.fn().mockResolvedValue({
        id: 'c1',
        internalCode: 'CL-001',
      }),
    };

    service = new AuthService(
      prisma as never,
      jwtService as never,
      config as never,
      clientsService as never,
      email as never,
      mfaSecret as never,
      mfaPolicy as never,
    );

    jest.clearAllMocks();
    mfaPolicy.requiresMfaEnrollment.mockResolvedValue(false);
    jwtService.signAsync.mockResolvedValue('access-jwt');
    config.getOrThrow.mockReturnValue('secret');
    email.send.mockResolvedValue(undefined);
  });

  describe('hashToken', () => {
    it('returns deterministic SHA-256 hex', () => {
      expect(service.hashToken('abc')).toHaveLength(64);
      expect(service.hashToken('a')).not.toBe(service.hashToken('b'));
    });
  });

  describe('validateUser', () => {
    it('rejects missing / inactive / bad password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.validateUser('a@x.com', 'x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      prisma.user.findUnique.mockResolvedValue(accessUser({ isActive: false }));
      await expect(service.validateUser('a@x.com', 'x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      prisma.user.findUnique.mockResolvedValue(accessUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.validateUser('a@x.com', 'x')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('returns user when password matches', async () => {
      const user = accessUser();
      prisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.validateUser('Ada@Example.com', 'pw')).resolves.toBe(
        user,
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'ada@example.com' },
        }),
      );
    });
  });

  describe('validateSsoUser / findUserByEmail', () => {
    it('rejects unprovisioned SSO users', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.validateSsoUser('a@x.com')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('returns active SSO user', async () => {
      const user = accessUser();
      prisma.user.findUnique.mockResolvedValue(user);
      await expect(service.validateSsoUser('ada@example.com')).resolves.toBe(
        user,
      );
    });

    it('rejects inactive SSO users', async () => {
      prisma.user.findUnique.mockResolvedValue(accessUser({ isActive: false }));
      await expect(service.validateSsoUser('ada@example.com')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('findUserByEmail normalizes email', async () => {
      const user = accessUser();
      prisma.user.findUnique.mockResolvedValue(user);
      await expect(service.findUserByEmail('Ada@Example.com')).resolves.toBe(user);
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'ada@example.com' } }),
      );
    });
  });

  describe('login', () => {
    it('returns mfaRequired when MFA enabled', async () => {
      const user = accessUser({ mfaEnabled: true, mfaSecret: 'enc:sec' });
      await expect(service.login(user)).resolves.toEqual({
        mfaRequired: true,
        pendingUserId: 'u1',
      });
    });

    it('issues tokens and updates lastLoginAt', async () => {
      const user = accessUser();
      prisma.user.update.mockResolvedValue(user);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login(user);

      expect(result.mfaRequired).toBe(false);
      expect(result.tokens?.accessToken).toBe('access-jwt');
      expect(result.tokens?.refreshToken).toHaveLength(96);
      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(result.user?.email).toBe('ada@example.com');
    });

    it('flags mfaEnrollmentRequired from policy', async () => {
      const user = accessUser();
      mfaPolicy.requiresMfaEnrollment.mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(user);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login(user);

      expect(result.mfaEnrollmentRequired).toBe(true);
      expect(result.user?.mfaEnrollmentRequired).toBe(true);
    });
  });

  describe('createMfaPendingToken', () => {
    it('signs mfa_pending JWT', async () => {
      await service.createMfaPendingToken('u1');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'u1', type: 'mfa_pending' },
        expect.objectContaining({ expiresIn: '5m' }),
      );
    });
  });

  describe('refresh / logout', () => {
    it('rejects invalid refresh tokens', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('bad')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects revoked or expired refresh tokens', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        revoked: true,
        expiresAt: new Date(Date.now() + 60_000),
        user: accessUser(),
      });
      await expect(service.refresh('raw')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        revoked: false,
        expiresAt: new Date(Date.now() - 60_000),
        user: accessUser(),
      });
      await expect(service.refresh('raw')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rotates a valid refresh token', async () => {
      const user = accessUser();
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        revoked: false,
        expiresAt: new Date(Date.now() + 60_000),
        user,
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('raw-refresh');
      expect(result.tokens.accessToken).toBe('access-jwt');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rt1' },
          data: { revoked: true },
        }),
      );
    });

    it('logout no-ops without token and revokes when present', async () => {
      await service.logout(undefined);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();

      await service.logout('raw');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revoked: true } }),
      );
    });
  });

  describe('getProfile / resolveSessionUser', () => {
    it('getProfile throws when missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('u1')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('getProfile returns public user', async () => {
      prisma.user.findUnique.mockResolvedValue(accessUser());
      const profile = await service.getProfile('u1');
      expect(profile).toMatchObject({
        id: 'u1',
        email: 'ada@example.com',
        roles: ['ip_attorney'],
        permissions: ['matter:read'],
      });
    });

    it('resolveSessionUser rejects inactive', async () => {
      prisma.user.findUnique.mockResolvedValue(accessUser({ isActive: false }));
      await expect(service.resolveSessionUser('u1')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('toAuthenticatedUser maps roles and permissions', () => {
      const auth = service.toAuthenticatedUser(accessUser());
      expect(auth).toMatchObject({
        userId: 'u1',
        roles: ['ip_attorney'],
        permissions: ['matter:read'],
      });
    });
  });

  describe('resetUserMfa', () => {
    it('throws when user missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.resetUserMfa('u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('clears MFA and revokes refresh tokens', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      await expect(service.resetUserMfa('u1')).resolves.toEqual({
        success: true,
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset / resetPassword', () => {
    it('returns generic message when user missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.requestPasswordReset('missing@x.com');
      expect(result.message).toMatch(/If an account exists/);
      expect(email.send).not.toHaveBeenCalled();
    });

    it('creates reset token and emails active user', async () => {
      prisma.user.findUnique.mockResolvedValue(accessUser());
      prisma.passwordResetToken.updateMany.mockResolvedValue({});
      prisma.passwordResetToken.create.mockResolvedValue({});

      await service.requestPasswordReset('ada@example.com');

      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
      expect(email.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'ada@example.com' }),
      );
    });

    it('resetPassword rejects invalid token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);
      await expect(
        service.resetPassword('tok', 'NewPass123!'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('resetPassword updates hash and revokes sessions', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt1',
        userId: 'u1',
        used: false,
        expiresAt: new Date(Date.now() + 60_000),
        user: { isActive: true },
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      await expect(
        service.resetPassword('tok', 'NewPass123!'),
      ).resolves.toEqual({ message: 'Your password has been updated.' });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('verifyMfaAndLogin / enableMfa / disableMfa', () => {
    it('verifyMfaAndLogin rejects invalid pending token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('expired'));
      await expect(
        service.verifyMfaAndLogin('bad', '123456'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('verifyMfaAndLogin accepts valid TOTP and issues tokens', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', type: 'mfa_pending' });
      const user = accessUser({ mfaEnabled: true, mfaSecret: 'enc:sec' });
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);
      prisma.refreshToken.create.mockResolvedValue({});
      (verify as jest.Mock).mockResolvedValue({ valid: true });

      const result = await service.verifyMfaAndLogin('pending', '123456');

      expect(result.tokens.accessToken).toBe('access-jwt');
      expect(mfaSecret.decrypt).toHaveBeenCalledWith('enc:sec');
    });

    it('enableMfa verifies code and returns backup codes', async () => {
      const user = accessUser({ mfaSecret: 'enc:sec' });
      prisma.user.findUnique
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ ...user, mfaEnabled: true });
      prisma.user.update.mockResolvedValue({ ...user, mfaEnabled: true });
      (verify as jest.Mock).mockResolvedValue({ valid: true });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');

      const result = await service.enableMfa('u1', '123456');

      expect(result.backupCodes).toHaveLength(10);
      expect(result.user.mfaEnabled).toBe(true);
    });

    it('disableMfa requires password and MFA code', async () => {
      const user = accessUser({
        mfaEnabled: true,
        mfaSecret: 'enc:sec',
        passwordHash: 'hashed',
      });
      prisma.user.findUnique
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ ...user, mfaEnabled: false });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.disableMfa('u1', 'wrong', '123456'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('regenerateBackupCodes requires enabled MFA', async () => {
      prisma.user.findUnique.mockResolvedValue(accessUser({ mfaEnabled: false }));
      await expect(
        service.regenerateBackupCodes('u1', '123456'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('registerPortalClient / registerPortalFromSso', () => {
    it('registerPortalClient rejects duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.registerPortalClient({
          email: 'ada@example.com',
          password: 'Pass123!',
          fullName: 'Ada Lovelace',
        } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('registerPortalClient creates client, user, and contact', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      prisma.role.findUniqueOrThrow.mockResolvedValue({ id: 'role-portal' });
      prisma.user.create.mockResolvedValue({ id: 'u-new' });
      prisma.user.findUniqueOrThrow.mockResolvedValue(accessUser({ id: 'u-new' }));

      const user = await service.registerPortalClient({
        email: 'Ada@Example.com',
        password: 'Pass123!',
        fullName: 'Ada Lovelace',
        companyName: 'Acme Ltd',
      } as never);

      expect(clientsService.createInTransaction).toHaveBeenCalled();
      expect(prisma.userRole.create).toHaveBeenCalled();
      expect(prisma.contact.create).toHaveBeenCalled();
      expect(user.id).toBe('u-new');
    });

    it('registerPortalFromSso returns existing active user', async () => {
      const existing = accessUser();
      prisma.user.findUnique.mockResolvedValue(existing);
      await expect(
        service.registerPortalFromSso('ada@example.com', 'Ada Lovelace'),
      ).resolves.toBe(existing);
    });

    it('registerPortalFromSso provisions new SSO portal user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUniqueOrThrow.mockResolvedValue({ id: 'role-portal' });
      prisma.user.create.mockResolvedValue({ id: 'u-sso' });
      prisma.user.findUniqueOrThrow.mockResolvedValue(accessUser({ id: 'u-sso' }));

      const user = await service.registerPortalFromSso(
        'new@example.com',
        'New User',
      );

      expect(clientsService.createInTransaction).toHaveBeenCalled();
      expect(user.id).toBe('u-sso');
    });
  });

  describe('startMfaSetup', () => {
    it('rejects inactive or already-enabled MFA', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.startMfaSetup('u1')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      prisma.user.findUnique.mockResolvedValue(
        accessUser({ mfaEnabled: true }),
      );
      await expect(service.startMfaSetup('u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('stores encrypted secret and returns otpauth url', async () => {
      prisma.user.findUnique.mockResolvedValue(accessUser());
      prisma.user.update.mockResolvedValue({});
      const result = await service.startMfaSetup('u1');
      expect(result.secret).toBeTruthy();
      expect(result.otpauthUrl).toContain('otpauth://');
      expect(mfaSecret.encrypt).toHaveBeenCalled();
    });
  });
});
