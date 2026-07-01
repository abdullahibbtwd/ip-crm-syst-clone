import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';

const ATTORNEY_ROLES = [
  SYSTEM_ROLES.IP_ATTORNEY,
  SYSTEM_ROLES.TRADEMARK_ATTORNEY,
  SYSTEM_ROLES.MANAGING_PARTNER,
] as const;

const TEAM_MEMBER_ROLES = [
  SYSTEM_ROLES.MANAGING_PARTNER,
  SYSTEM_ROLES.IP_ATTORNEY,
  SYSTEM_ROLES.TRADEMARK_ATTORNEY,
  SYSTEM_ROLES.COORDINATOR,
  SYSTEM_ROLES.PARALEGAL,
  SYSTEM_ROLES.DOCKETING_ADMIN,
] as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listAttorneyAssignees() {
    const rows = await this.prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          some: {
            role: {
              name: { in: [...ATTORNEY_ROLES] },
            },
          },
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        userRoles: {
          select: {
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    return rows.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      roles: user.userRoles.map((r) => r.role.name),
    }));
  }

  async listTeamMembers() {
    const rows = await this.prisma.user.findMany({
      where: {
        isActive: true,
        clientId: null,
        userRoles: {
          some: {
            role: {
              name: { in: [...TEAM_MEMBER_ROLES] },
            },
          },
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        userRoles: {
          select: {
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    return rows.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      roles: user.userRoles.map((r) => r.role.name),
    }));
  }
}
