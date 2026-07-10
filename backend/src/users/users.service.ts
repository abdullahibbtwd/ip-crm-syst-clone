import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { clientDisplayName } from '../crm/crm.utils';
import { parseLimit } from '../crm/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLES, type SystemRole } from '../rbac/rbac.constants';
import type { InviteUserDto } from './dto/invite-user.dto';
import {
  TEAM_ASSIGNABLE_ROLES,
  type UpdateUserRoleDto,
} from './dto/update-user-role.dto';
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

  /**
   * Provision a user for SSO (passwordHash null) or refresh an existing invite.
   * Matches backend/scripts/invite-user.ts behaviour.
   */
  async invite(dto: InviteUserDto) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    const role = dto.role;

    if (role === SYSTEM_ROLES.PORTAL_CLIENT && !dto.clientCode?.trim()) {
      throw new BadRequestException(
        'Portal client invites require a client internal code (clientCode).',
      );
    }

    if (role !== SYSTEM_ROLES.PORTAL_CLIENT && dto.clientCode?.trim()) {
      throw new BadRequestException(
        'clientCode is only allowed when inviting a portal_client.',
      );
    }

    const roleRow = await this.prisma.role.findUnique({ where: { name: role } });
    if (!roleRow) {
      throw new BadRequestException(
        `Role "${role}" is not seeded. Run: npx prisma db seed`,
      );
    }

    let clientId: string | null = null;
    if (dto.clientCode?.trim()) {
      const client = await this.prisma.client.findFirst({
        where: { internalCode: dto.clientCode.trim() },
        select: { id: true },
      });
      if (!client) {
        throw new BadRequestException(
          `Client not found with internal code "${dto.clientCode.trim()}".`,
        );
      }
      clientId = client.id;
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        clientId: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });

    if (existing) {
      const existingRoles = existing.userRoles.map((r) => r.role.name);
      const isPortal = existingRoles.includes(SYSTEM_ROLES.PORTAL_CLIENT);
      const invitingPortal = role === SYSTEM_ROLES.PORTAL_CLIENT;

      if (isPortal !== invitingPortal) {
        throw new BadRequestException(
          invitingPortal
            ? 'That email already belongs to a team user.'
            : 'That email already belongs to a portal user.',
        );
      }
    }

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {
        fullName,
        isActive: true,
        ...(clientId !== null ? { clientId } : {}),
      },
      create: {
        email,
        fullName,
        isActive: true,
        passwordHash: null,
        clientId,
      },
      select: userListSelect,
    });

    if (role !== SYSTEM_ROLES.PORTAL_CLIENT) {
      // Team invite: replace staff roles with the invited role (single primary).
      await this.replaceTeamRoles(user.id, role);
    } else {
      await this.prisma.userRole.upsert({
        where: {
          userId_roleId: { userId: user.id, roleId: roleRow.id },
        },
        update: {},
        create: { userId: user.id, roleId: roleRow.id },
      });
    }

    const refreshed = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: userListSelect,
    });

    return this.toListItem(refreshed);
  }

  async updateRole(
    userId: string,
    dto: UpdateUserRoleDto,
    actorUserId: string,
  ) {
    if (userId === actorUserId) {
      throw new BadRequestException('You cannot change your own role.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = user.userRoles.map((r) => r.role.name);
    if (roles.includes(SYSTEM_ROLES.PORTAL_CLIENT)) {
      throw new BadRequestException(
        'Portal client roles cannot be changed here. Invite or link via the portal flow.',
      );
    }

    if (
      !(TEAM_ASSIGNABLE_ROLES as readonly string[]).includes(dto.role)
    ) {
      throw new BadRequestException('Invalid team role');
    }

    await this.replaceTeamRoles(userId, dto.role);

    const refreshed = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: userListSelect,
    });

    return this.toListItem(refreshed);
  }

  private async replaceTeamRoles(userId: string, roleName: SystemRole) {
    const roleRow = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!roleRow) {
      throw new BadRequestException(
        `Role "${roleName}" is not seeded. Run: npx prisma db seed`,
      );
    }

    const portalRole = await this.prisma.role.findUnique({
      where: { name: SYSTEM_ROLES.PORTAL_CLIENT },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: {
          userId,
          ...(portalRole
            ? { roleId: { not: portalRole.id } }
            : {}),
        },
      });
      await tx.userRole.upsert({
        where: {
          userId_roleId: { userId, roleId: roleRow.id },
        },
        update: {},
        create: { userId, roleId: roleRow.id },
      });
    });
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
