import { Injectable } from '@nestjs/common'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PortalAccessService } from '../common/portal-access.service'
import { PrismaService } from '../prisma/prisma.service'
import { parseLimit } from '../crm/dto/pagination.dto'
import type { ListIpRightsQueryDto } from './dto/ip-rights-query.dto'
import { MatterType, IpRightStatus } from '../../generated/prisma/client'

function clientDisplayName(client: {
  type: string
  companyName: string | null
  firstName: string | null
  lastName: string | null
  internalCode: string | null
}): string {
  if (client.companyName) return client.companyName
  const name = [client.firstName, client.lastName].filter(Boolean).join(' ').trim()
  return name || client.internalCode || 'Client'
}

@Injectable()
export class IpRightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  async list(user: AuthenticatedUser, query: ListIpRightsQueryDto) {
    const scopeClientId = this.portalAccess.requireScopeClientId(user)
    const effectiveClientId = scopeClientId ?? query.clientId

    const where: any = {}
    if (effectiveClientId) where.clientId = effectiveClientId
    if (query.jurisdiction) where.jurisdiction = query.jurisdiction.trim().toUpperCase()
    if (query.status) where.status = query.status
    if (query.matterType) where.rightType = query.matterType

    if (query.expiryFrom || query.expiryTo) {
      where.expiryDate = {
        ...(query.expiryFrom ? { gte: new Date(query.expiryFrom) } : {}),
        ...(query.expiryTo ? { lte: new Date(query.expiryTo) } : {}),
      }
    }

    const take = parseLimit(query.limit, 50)

    const rows = await this.prisma.ipRight.findMany({
      where,
      orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        matter: {
          select: {
            id: true,
            title: true,
            matterType: true,
          },
        },
        client: {
          select: {
            id: true,
            type: true,
            companyName: true,
            firstName: true,
            lastName: true,
            internalCode: true,
          },
        },
      },
    })

    const hasMore = rows.length > take
    const items = hasMore ? rows.slice(0, take) : rows

    return {
      items: items.map((r) => ({
        id: r.id,
        matterId: r.matterId,
        matterTitle: r.matter.title,
        matterType: r.rightType as MatterType,
        clientId: r.clientId,
        clientName: clientDisplayName(r.client),
        title: r.title,
        applicationNumber: r.applicationNumber,
        registrationNumber: r.registrationNumber,
        jurisdiction: r.jurisdiction,
        status: r.status as IpRightStatus,
        filingDate: r.filingDate ? r.filingDate.toISOString() : null,
        expiryDate: r.expiryDate ? r.expiryDate.toISOString() : null,
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    }
  }
}

