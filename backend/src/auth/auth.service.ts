import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { verify, generateSecret, generateURI } from 'otplib';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
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

const MFA_ISSUER = 'IP Consulting CRM';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
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
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: userAccessInclude,
    });

    if (!user?.isActive) {
      throw new UnauthorizedException(
        'SSO account not provisioned. Contact your administrator.',
      );
    }

    return user;
  }

  async login(
    user: UserWithAccess,
  ): Promise<LoginResult & { tokens?: TokenPair }> {
    if (user.mfaEnabled && user.mfaSecret) {
      return { mfaRequired: true, pendingUserId: user.id };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.createTokenPair(user);
    return { mfaRequired: false, user: this.toPublicUser(user), tokens };
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

    const result = await verify({
      token: code,
      secret: user.mfaSecret,
    });

    if (!result.valid) {
      throw new UnauthorizedException('Invalid authentication code');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.createTokenPair(user);
    return { user: this.toPublicUser(user), tokens };
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
    return { user: this.toPublicUser(stored.user), tokens };
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
    return this.toPublicUser(user);
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
      data: { mfaSecret: secret, mfaEnabled: false },
    });

    const otpauthUrl = generateURI({
      issuer: MFA_ISSUER,
      label: user.email,
      secret,
    });

    return { otpauthUrl, secret };
  }

  async enableMfa(userId: string, code: string): Promise<PublicUser> {
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

    const result = await verify({
      token: code,
      secret: user.mfaSecret,
    });

    if (!result.valid) {
      throw new BadRequestException('Invalid authentication code');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
      include: userAccessInclude,
    });

    return this.toPublicUser(updated);
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

    if (this.config.get('NODE_ENV') !== 'production') {
      console.log(`[dev] Password reset link for ${user.email}: ${resetUrl}`);
    }

    // TODO: send email via transactional provider in production
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

  private async createTokenPair(user: UserWithAccess): Promise<TokenPair> {
    const authUser = buildAuthenticatedUser(user);
    const accessToken = await this.jwtService.signAsync(
      {
        sub: authUser.sub,
        email: authUser.email,
        roles: authUser.roles,
        permissions: authUser.permissions,
        clientId: authUser.clientId,
        type: 'access',
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

  private toPublicUser(user: UserWithAccess): PublicUser {
    const { roles, permissions } = buildAuthenticatedUser(user);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      clientId: user.clientId,
      roles,
      permissions,
      mfaEnabled: user.mfaEnabled,
    };
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
