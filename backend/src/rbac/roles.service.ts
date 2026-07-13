import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMatrix() {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: { resource: true, action: true },
            },
          },
        },
      },
    })

    return {
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        permissions: role.rolePermissions
          .map((rp) => `${rp.permission.resource}:${rp.permission.action}`)
          .sort(),
      })),
    }
  }
}
