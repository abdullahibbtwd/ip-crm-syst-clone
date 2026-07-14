import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { verify, generateSecret, generateURI } from 'otplib';
import { createHash, randomBytes } from 'node:crypto';
import {
  ClientType,
  ContactRole,
  RelationshipEventType,
} from '../../generated/prisma/client';
import { ClientsService } from '../crm/clients/clients.service';
import { EmailService } from '../notifications/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import type { RegisterDto } from './dto/auth.dto';
import {
  AuthenticatedUser,
  JwtPayload,
  LoginResult,
  PublicUser,
  TokenPair,
} from './auth.types';

import {
  buildAuthenticatedUser,
  userAccessInclude,
  type UserWithAccess,
} from './user-access';
import { MfaPolicyService } from './mfa-policy.service';
import { MfaSecretService } from './mfa-secret.service';

const MFA_ISSUER = 'IP Consulting CRM';
const BACKUP_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: 'Client', lastName: 'User' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly clientsService: ClientsService,
    private readonly email: EmailService,
    private readonly mfaSecret: MfaSecretService,
    private readonly mfaPolicy: MfaPolicyService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserWithAccess> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: userAccessInclude,
    });

    if (!user?.passwordHash || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async validateSsoUser(email: string): Promise<UserWithAccess> {
    const user = await this.findUserByEmail(email);
    if (!user?.isActive) {
      throw new UnauthorizedException(
        'SSO account not provisioned. Contact your administrator.',
      );
    }
    return user;
  }

  async findUserByEmail(email: string): Promise<UserWithAccess | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: userAccessInclude,
    });
  }

  async registerPortalClient(dto: RegisterDto): Promise<UserWithAccess> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const companyName = dto.companyName?.trim();

    return this.prisma.$transaction(async (tx) => {
      const client = await this.clientsService.createInTransaction(tx, {
        type: companyName ? ClientType.company : ClientType.individual,
        companyName: companyName || undefined,
        ...(companyName
          ? {}
          : splitFullName(dto.fullName.trim())),
        gdprConsent: true,
      });

      const portalRole = await tx.role.findUniqueOrThrow({
        where: { name: SYSTEM_ROLES.PORTAL_CLIENT },
      });

      const user = await tx.user.create({
        data: {
          email,
          fullName: dto.fullName.trim(),
          passwordHash,
          isActive: true,
          clientId: client.id,
        },
        include: userAccessInclude,
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: portalRole.id },
      });

      const { firstName, lastName } = companyName
        ? splitFullName(dto.fullName.trim())
        : splitFullName(dto.fullName.trim());

      await tx.contact.create({
        data: {
          clientId: client.id,
          role: ContactRole.primary,
          firstName,
          lastName,
          email,
        },
      });

      await tx.relationshipHistory.create({
        data: {
          clientId: client.id,
          userId: user.id,
          eventType: RelationshipEventType.created,
          description: `Client self-registered via portal (${client.internalCode})`,
          metadata: { source: 'portal_signup', email },
        },
      });

      const withRoles = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: userAccessInclude,
      });

      return withRoles;
    });
  }

  async registerPortalFromSso(
    email: string,
    fullName: string,
  ): Promise<UserWithAccess> {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: userAccessInclude,
    });
    if (existing) {
      if (!existing.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }
      return existing;
    }

    return this.prisma.$transaction(async (tx) => {
      const { firstName, lastName } = splitFullName(fullName.trim());

      const client = await this.clientsService.createInTransaction(tx, {
        type: ClientType.individual,
        firstName,
        lastName,
        gdprConsent: true,
      });

      const portalRole = await tx.role.findUniqueOrThrow({
        where: { name: SYSTEM_ROLES.PORTAL_CLIENT },
      });

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          fullName: fullName.trim(),
          passwordHash: null,
          isActive: true,
          clientId: client.id,
        },
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: portalRole.id },
      });

      await tx.contact.create({
        data: {
          clientId: client.id,
          role: ContactRole.primary,
          firstName,
          lastName,
          email: normalizedEmail,
        },
      });

      await tx.relationshipHistory.create({
        data: {
          clientId: client.id,
          userId: user.id,
          eventType: RelationshipEventType.created,
          description: `Client self-registered via SSO (${client.internalCode})`,
          metadata: { source: 'portal_sso_signup', email: normalizedEmail },
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: userAccessInclude,
      });
    });
  }

  async login(
    user: UserWithAccess,
  ): Promise<LoginResult & { tokens?: TokenPair }> {
    if (user.mfaEnabled && user.mfaSecret) {
      return { mfaRequired: true, pendingUserId: user.id };
    }

    const mfaEnrollmentRequired =
      await this.mfaPolicy.requiresMfaEnrollment(user);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.createTokenPair(user, { mfaEnrollmentRequired });
    return {
      mfaRequired: false,
      user: await this.toPublicUser(user, mfaEnrollmentRequired),
      tokens,
      mfaEnrollmentRequired,
    };
  }

  async createMfaPendingToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, type: 'mfa_pending' },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '5m',
      },
    );
  }

  async verifyMfaAndLogin(
    mfaPendingToken: string,
    code: string,
  ): Promise<{ user: PublicUser; tokens: TokenPair }> {
    let payload: { sub: string; type?: string };
    try {
      payload = await this.jwtService.verifyAsync<{
        sub: string;
        type?: string;
      }>(mfaPendingToken, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('MFA session expired - sign in again');
    }

    if (payload.type !== 'mfa_pending') {
      throw new UnauthorizedException('Invalid MFA session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: userAccessInclude,
    });

    if (!user?.isActive || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('MFA is not enabled for this account');
    }

    const secret = this.mfaSecret.decrypt(user.mfaSecret);
    const normalizedCode = code.replace(/\s/g, '').toUpperCase();

    if (/^\d{6}$/.test(normalizedCode)) {
      const result = await verify({
        token: normalizedCode,
        secret,
      });

      if (!result.valid) {
        throw new UnauthorizedException('Invalid authentication code');
      }
    } else {
      const backupValid = await this.consumeBackupCode(user.id, normalizedCode);
      if (!backupValid) {
        throw new UnauthorizedException('Invalid authentication code');
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const mfaEnrollmentRequired =
      await this.mfaPolicy.requiresMfaEnrollment(user);
    const tokens = await this.createTokenPair(user, { mfaEnrollmentRequired });
    return {
      user: await this.toPublicUser(user, mfaEnrollmentRequired),
      tokens,
    };
  }

  async refresh(
    refreshToken: string,
  ): Promise<{ user: PublicUser; tokens: TokenPair }> {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: userAccessInclude } },
    });

    if (
      !stored ||
      stored.revoked ||
      stored.expiresAt < new Date() ||
      !stored.user.isActive
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    const tokens = await this.createTokenPair(stored.user);
    const mfaEnrollmentRequired =
      await this.mfaPolicy.requiresMfaEnrollment(stored.user);
    return {
      user: await this.toPublicUser(stored.user, mfaEnrollmentRequired),
      tokens,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revoked: false },
      data: { revoked: true },
    });
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userAccessInclude,
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const mfaEnrollmentRequired =
      await this.mfaPolicy.requiresMfaEnrollment(user);
    return this.toPublicUser(user, mfaEnrollmentRequired);
  }

  async startMfaSetup(
    userId: string,
  ): Promise<{ otpauthUrl: string; secret: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive) {
      throw new UnauthorizedException('User not found');
    }
    if (user.mfaEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: this.mfaSecret.encrypt(secret), mfaEnabled: false },
    });

    const otpauthUrl = generateURI({
      issuer: MFA_ISSUER,
      label: user.email,
      secret,
    });

    return { otpauthUrl, secret };
  }

  async enableMfa(
    userId: string,
    code: string,
  ): Promise<{ user: PublicUser; backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userAccessInclude,
    });

    if (!user?.isActive) {
      throw new UnauthorizedException('User not found');
    }
    if (user.mfaEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }
    if (!user.mfaSecret) {
      throw new BadRequestException('Start two-factor setup before confirming');
    }

    const secret = this.mfaSecret.decrypt(user.mfaSecret);
    const result = await verify({
      token: code,
      secret,
    });

    if (!result.valid) {
      throw new BadRequestException('Invalid authentication code');
    }

    const backupCodes = await this.replaceBackupCodes(userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
      include: userAccessInclude,
    });

    return {
      user: await this.toPublicUser(updated, false),
      backupCodes,
    };
  }

  async disableMfa(
    userId: string,
    password: string,
    code: string,
  ): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userAccessInclude,
    });

    if (!user?.isActive || !user.passwordHash) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid password');
    }

    await this.assertMfaCode(user, code);

    await this.prisma.$transaction([
      this.prisma.mfaBackupCode.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: false, mfaSecret: null },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      }),
    ]);

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: userAccessInclude,
    });

    const mfaEnrollmentRequired =
      await this.mfaPolicy.requiresMfaEnrollment(updated);
    return this.toPublicUser(updated, mfaEnrollmentRequired);
  }

  async regenerateBackupCodes(userId: string, code: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userAccessInclude,
    });

    if (!user?.isActive || !user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    await this.assertMfaCode(user, code);
    return this.replaceBackupCodes(userId);
  }

  async resetUserMfa(targetUserId: string): Promise<{ success: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.prisma.$transaction([
      this.prisma.mfaBackupCode.deleteMany({ where: { userId: targetUserId } }),
      this.prisma.user.update({
        where: { id: targetUserId },
        data: { mfaEnabled: false, mfaSecret: null },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: targetUserId, revoked: false },
        data: { revoked: true },
      }),
    ]);

    return { success: true };
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    const message =
      'If an account exists for that email, password reset instructions have been sent.';

    if (!user?.isActive || !user.passwordHash) {
      return { message };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const frontendUrl = this.config.get(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    const subject = 'Reset your IP Consulting CRM password';
    const text = [
      `Hello ${user.fullName},`,
      '',
      'We received a request to reset your password. Open this link within one hour:',
      resetUrl,
      '',
      'If you did not request a password reset, you can ignore this email.',
    ].join('\n');
    const html = [
      `<p>Hello ${escapeHtml(user.fullName)},</p>`,
      '<p>We received a request to reset your password. This link expires in one hour:</p>',
      `<p><a href="${resetUrl}">Reset password</a></p>`,
      `<p style="word-break:break-all;color:#555;font-size:12px">${escapeHtml(resetUrl)}</p>`,
      '<p>If you did not request a password reset, you can ignore this email.</p>',
    ].join('');

    try {
      await this.email.send({ to: user.email, subject, text, html });
    } catch (err) {
      this.logger.error(
        `Failed to send password reset email to ${user.email}`,
        err instanceof Error ? err.stack : String(err),
      );
    }

    return { message };
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    const tokenHash = this.hashToken(token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !record ||
      record.used ||
      record.expiresAt < new Date() ||
      !record.user.isActive
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revoked: false },
        data: { revoked: true },
      }),
    ]);

    return { message: 'Your password has been updated.' };
  }

  async resolveSessionUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userAccessInclude,
    });
    if (!user?.isActive) {
      throw new UnauthorizedException('User inactive');
    }
    return buildAuthenticatedUser(user);
  }

  toAuthenticatedUser(user: UserWithAccess): AuthenticatedUser {
    return buildAuthenticatedUser(user);
  }

  private async createTokenPair(
    user: UserWithAccess,
    options?: { mfaEnrollmentRequired?: boolean },
  ): Promise<TokenPair> {
    const authUser = buildAuthenticatedUser(user);
    const accessToken = await this.jwtService.signAsync(
      {
        sub: authUser.sub,
        email: authUser.email,
        roles: authUser.roles,
        permissions: authUser.permissions,
        clientId: authUser.clientId,
        type: 'access',
        mfaEnrollmentRequired: options?.mfaEnrollmentRequired ?? false,
      } satisfies JwtPayload,
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const refreshExpiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');
    const expiresAt = this.addDuration(new Date(), refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private async toPublicUser(
    user: UserWithAccess,
    mfaEnrollmentRequired = false,
  ): Promise<PublicUser> {
    const { roles, permissions } = buildAuthenticatedUser(user);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      clientId: user.clientId,
      roles,
      permissions,
      mfaEnabled: user.mfaEnabled,
      mfaEnrollmentRequired,
    };
  }

  private generateBackupCode(): string {
    const part = (len: number) =>
      Array.from({ length: len }, () =>
        BACKUP_CODE_CHARS.charAt(
          randomBytes(1)[0]! % BACKUP_CODE_CHARS.length,
        ),
      ).join('');
    return `${part(4)}-${part(4)}`;
  }

  private normalizeBackupCode(code: string): string {
    return code.replace(/\s/g, '').replace('-', '').toUpperCase();
  }

  private async replaceBackupCodes(userId: string): Promise<string[]> {
    const codes = Array.from({ length: 10 }, () => this.generateBackupCode());
    const rows = await Promise.all(
      codes.map(async (code) => ({
        userId,
        codeHash: await bcrypt.hash(this.normalizeBackupCode(code), 10),
      })),
    );

    await this.prisma.$transaction([
      this.prisma.mfaBackupCode.deleteMany({ where: { userId } }),
      this.prisma.mfaBackupCode.createMany({ data: rows }),
    ]);

    return codes;
  }

  private async consumeBackupCode(
    userId: string,
    rawCode: string,
  ): Promise<boolean> {
    const normalized = this.normalizeBackupCode(rawCode);
    if (normalized.length !== 8) return false;

    const codes = await this.prisma.mfaBackupCode.findMany({
      where: { userId, usedAt: null },
    });

    for (const entry of codes) {
      const match = await bcrypt.compare(normalized, entry.codeHash);
      if (match) {
        await this.prisma.mfaBackupCode.update({
          where: { id: entry.id },
          data: { usedAt: new Date() },
        });
        return true;
      }
    }

    return false;
  }

  private async assertMfaCode(user: UserWithAccess, code: string): Promise<void> {
    if (!user.mfaSecret) {
      throw new BadRequestException('Two-factor authentication is not configured');
    }

    const secret = this.mfaSecret.decrypt(user.mfaSecret);
    const normalizedCode = code.replace(/\s/g, '').toUpperCase();

    if (/^\d{6}$/.test(normalizedCode)) {
      const result = await verify({ token: normalizedCode, secret });
      if (!result.valid) {
        throw new UnauthorizedException('Invalid authentication code');
      }
      return;
    }

    const backupValid = await this.consumeBackupCode(user.id, normalizedCode);
    if (!backupValid) {
      throw new UnauthorizedException('Invalid authentication code');
    }
  }

  hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private addDuration(base: Date, duration: string) {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) return new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);

    const value = Number(match[1]);
    const unit = match[2];
    const ms =
      unit === 's'
        ? value * 1000
        : unit === 'm'
          ? value * 60 * 1000
          : unit === 'h'
            ? value * 60 * 60 * 1000
            : value * 24 * 60 * 60 * 1000;

    return new Date(base.getTime() + ms);
  }
}
