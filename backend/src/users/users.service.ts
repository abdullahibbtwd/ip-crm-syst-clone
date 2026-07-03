import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { clientDisplayName } from '../crm/crm.utils';
import { parseLimit } from '../crm/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { UserQueryDto, UserSegment } from './dto/user-query.dto';

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

const userListSelect = {
  id: true,
  email: true,
  fullName: true,
  isActive: true,
  mfaEnabled: true,
  passwordHash: true,
  clientId: true,
  lastLoginAt: true,
  createdAt: true,
  portalClient: {
    select: {
      id: true,
      internalCode: true,
      companyName: true,
      firstName: true,
      lastName: true,
      type: true,
    },
  },
  userRoles: {
    select: {
      role: { select: { name: true } },
    },
  },
} satisfies Prisma.UserSelect;

type UserListRow = Prisma.UserGetPayload<{ select: typeof userListSelect }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UserQueryDto) {
    const take = parseLimit(query.limit, 20);
    const search = query.search?.trim();
    const isPortal = query.segment === UserSegment.portal;

    const where: Prisma.UserWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(isPortal
        ? {
            userRoles: {
              some: { role: { name: SYSTEM_ROLES.PORTAL_CLIENT } },
            },
          }
        : {
            userRoles: {
              none: { role: { name: SYSTEM_ROLES.PORTAL_CLIENT } },
            },
          }),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              ...(isPortal
                ? [
                    {
                      portalClient: {
                        internalCode: { contains: search, mode: 'insensitive' as const },
                      },
                    },
                  ]
                : []),
            ],
          }
        : {}),
    };

    const rows = await this.prisma.user.findMany({
      where,
      orderBy: isPortal ? { createdAt: 'desc' } : { fullName: 'asc' },
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: userListSelect,
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;

    return {
      items: items.map((user) => this.toListItem(user)),
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  }

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

  private toListItem(user: UserListRow) {
    const roles = user.userRoles.map((r) => r.role.name);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      authMethod: user.passwordHash ? ('password' as const) : ('sso' as const),
      roles,
      clientId: user.clientId,
      client: user.portalClient
        ? {
            id: user.portalClient.id,
            internalCode: user.portalClient.internalCode,
            displayName: clientDisplayName(user.portalClient),
          }
        : null,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
