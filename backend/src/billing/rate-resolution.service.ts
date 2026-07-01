import { Injectable } from '@nestjs/common';
import {
  BillingRateRole,
  MatterType,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BILLING_RATE_ROLE_PRIORITY,
  type BillingRateRoleSlug,
} from './billing.constants';
import { decimalToNumber } from './billing.utils';

export type ResolvedRate = {
  hourlyRate: number;
  currency: string;
  rateCardId: string | null;
  role: BillingRateRole | null;
  isUnrated: boolean;
  resolutionLevel:
    | 'client_matter_type'
    | 'firm_matter_type'
    | 'firm_any_matter_type'
    | 'unrated';
};

@Injectable()
export class RateResolutionService {
  constructor(private readonly prisma: PrismaService) {}

  pickBillingRole(userRoles: string[]): BillingRateRole | null {
    for (const role of BILLING_RATE_ROLE_PRIORITY) {
      if (userRoles.includes(role)) {
        return role as BillingRateRole;
      }
    }
    return null;
  }

  async resolveForMatter(params: {
    matterId: string;
    userRoles: string[];
    roleOverride?: BillingRateRole;
    asOfDate?: Date;
  }): Promise<ResolvedRate> {
    const matter = await this.prisma.matter.findUnique({
      where: { id: params.matterId },
      select: { id: true, clientId: true, matterType: true },
    });
    if (!matter) {
      return this.unrated();
    }

    const role =
      params.roleOverride ?? this.pickBillingRole(params.userRoles);
    if (!role) {
      return this.unrated();
    }

    const asOf = params.asOfDate ?? new Date();
    const activeOn = this.activeOnDateFilter(asOf);

    const clientSpecific = await this.prisma.rateCard.findFirst({
      where: {
        role,
        clientId: matter.clientId,
        matterType: matter.matterType,
        ...activeOn,
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (clientSpecific) {
      return this.toResolved(clientSpecific, 'client_matter_type');
    }

    const firmMatterType = await this.prisma.rateCard.findFirst({
      where: {
        role,
        clientId: null,
        matterType: matter.matterType,
        ...activeOn,
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (firmMatterType) {
      return this.toResolved(firmMatterType, 'firm_matter_type');
    }

    const firmAnyType = await this.prisma.rateCard.findFirst({
      where: {
        role,
        clientId: null,
        matterType: null,
        ...activeOn,
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (firmAnyType) {
      return this.toResolved(firmAnyType, 'firm_any_matter_type');
    }

    return { ...this.unrated(), role };
  }

  private activeOnDateFilter(asOf: Date): Prisma.RateCardWhereInput {
    return {
      effectiveFrom: { lte: asOf },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
    };
  }

  private toResolved(
    card: {
      id: string;
      hourlyRate: Prisma.Decimal;
      currency: string;
      role: BillingRateRole;
    },
    resolutionLevel: ResolvedRate['resolutionLevel'],
  ): ResolvedRate {
    return {
      hourlyRate: decimalToNumber(card.hourlyRate),
      currency: card.currency,
      rateCardId: card.id,
      role: card.role,
      isUnrated: false,
      resolutionLevel,
    };
  }

  private unrated(): ResolvedRate {
    return {
      hourlyRate: 0,
      currency: 'EUR',
      rateCardId: null,
      role: null,
      isUnrated: true,
      resolutionLevel: 'unrated',
    };
  }
}
