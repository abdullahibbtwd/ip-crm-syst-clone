import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientType,
  Prisma,
  type Client,
} from '../../generated/prisma/client';
import type { ClientsService } from '../crm/clients/clients.service';
import {
  isIntakePartyProvided,
  type IntakePartyDto,
} from './dto/intake-party.dto';

export type ResolvedMatterParties = {
  applicantClientId: string | null;
  intermediaryClientId: string | null;
  ownerClientId: string;
};

/**
 * Normalize party JSON for storage on IntakeLead (strip empty).
 */
export function packIntakeParty(
  party?: IntakePartyDto | null,
): Prisma.InputJsonValue | undefined {
  if (!isIntakePartyProvided(party)) return undefined;
  if (party.existingClientId?.trim()) {
    return { existingClientId: party.existingClientId.trim() };
  }
  const type = party.type ?? (party.companyName ? ClientType.company : ClientType.individual);
  return {
    type,
    companyName: party.companyName?.trim() || undefined,
    fullName: party.fullName?.trim() || undefined,
    country: party.country?.trim().toUpperCase() || undefined,
  };
}

export function readIntakeParty(
  value: unknown,
): IntakePartyDto | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as IntakePartyDto;
}

/**
 * Resolve applicant / intermediary to Client ids.
 * Applicant omitted or equal to instructing client → applicantClientId null;
 * ownerClientId always = applicant ?? instructing.
 */
export async function resolveMatterParties(
  tx: Prisma.TransactionClient,
  clientsService: ClientsService,
  instructingClientId: string,
  applicant?: IntakePartyDto | null,
  intermediary?: IntakePartyDto | null,
): Promise<ResolvedMatterParties> {
  const applicantId = await resolvePartyClientId(
    tx,
    clientsService,
    applicant,
  );
  const intermediaryId = await resolvePartyClientId(
    tx,
    clientsService,
    intermediary,
  );

  const applicantClientId =
    applicantId && applicantId !== instructingClientId ? applicantId : null;
  const intermediaryClientId =
    intermediaryId && intermediaryId !== instructingClientId
      ? intermediaryId
      : null;

  return {
    applicantClientId,
    intermediaryClientId,
    ownerClientId: applicantClientId ?? instructingClientId,
  };
}

async function resolvePartyClientId(
  tx: Prisma.TransactionClient,
  clientsService: ClientsService,
  party?: IntakePartyDto | null,
): Promise<string | null> {
  if (!isIntakePartyProvided(party)) return null;

  if (party.existingClientId?.trim()) {
    const existing = await tx.client.findUnique({
      where: { id: party.existingClientId.trim() },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Party client not found');
    }
    return existing.id;
  }

  const type =
    party.type ??
    (party.companyName?.trim() ? ClientType.company : ClientType.individual);

  if (type === ClientType.company) {
    if (!party.companyName?.trim()) {
      throw new BadRequestException('Applicant/intermediary company name is required');
    }
    const created = await clientsService.createInTransaction(tx, {
      type: ClientType.company,
      companyName: party.companyName.trim(),
      country: party.country?.trim(),
      gdprConsent: true,
    });
    return created.id;
  }

  const parts = party.fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) {
    throw new BadRequestException('Applicant/intermediary full name is required');
  }
  const created = await clientsService.createInTransaction(tx, {
    type: ClientType.individual,
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : parts[0],
    country: party.country?.trim(),
    gdprConsent: true,
  });
  return created.id;
}

export function clientPartySelect() {
  return {
    id: true,
    internalCode: true,
    companyName: true,
    firstName: true,
    lastName: true,
    type: true,
  } as const;
}

export type ClientPartySummary = Pick<
  Client,
  'id' | 'internalCode' | 'companyName' | 'firstName' | 'lastName' | 'type'
>;
