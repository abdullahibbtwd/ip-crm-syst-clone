import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';

export type ManagingPartnerRecipient = {
  id: string;
  email: string;
  fullName: string;
};

/**
 * Users who hold the managing_partner role - firm-wide oversight, not per-deadline assignment.
 */
@Injectable()
export class ManagingPartnerAudienceService {
  constructor(private readonly prisma: PrismaService) {}

  listActiveManagingPartners(): Promise<ManagingPartnerRecipient[]> {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          some: { role: { name: SYSTEM_ROLES.MANAGING_PARTNER } },
        },
      },
      select: { id: true, email: true, fullName: true },
      orderBy: { fullName: 'asc' },
    });
  }
}
