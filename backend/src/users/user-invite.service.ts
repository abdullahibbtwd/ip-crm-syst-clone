import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { buildInviteEmail } from '../notifications/email-templates';
import { EmailService } from '../notifications/email.service';
import { PrismaService } from '../prisma/prisma.service';

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class UserInviteService {
  private readonly logger = new Logger(UserInviteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async createToken(userId: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

    await this.prisma.userInviteToken.updateMany({
      where: { userId, used: false },
      data: { used: true },
    });

    await this.prisma.userInviteToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return rawToken;
  }

  async sendInviteEmail(userId: string): Promise<{
    sent: boolean;
    error?: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, isActive: true },
    });

    if (!user?.isActive) {
      return { sent: false, error: 'User not found or inactive' };
    }

    const rawToken = await this.createToken(user.id);
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:5173');
    const inviteUrl = `${frontendUrl}/accept-invite?token=${rawToken}`;

    const { subject, text, html } = buildInviteEmail({
      fullName: user.fullName,
      inviteUrl,
    });

    try {
      await this.email.send({ to: user.email, subject, text, html });
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          inviteEmailSentAt: new Date(),
          inviteEmailLastError: null,
        },
      });
      return { sent: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send invite email';
      this.logger.error(
        `Failed to send invite email to ${user.email}`,
        err instanceof Error ? err.stack : String(err),
      );
      await this.prisma.user.update({
        where: { id: user.id },
        data: { inviteEmailLastError: errorMessage },
      });
      return { sent: false, error: errorMessage };
    }
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
