import { Injectable } from '@nestjs/common';
import { MatterStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { extractClientRef } from './email-classification';

export type MatterSuggestion = {
  suggestedMatterId: string | null;
  suggestedClientId: string | null;
  suggestionReason: string | null;
};

const ACTIVE_MATTER_STATUSES: MatterStatus[] = [
  MatterStatus.draft,
  MatterStatus.active,
  MatterStatus.on_hold,
];

@Injectable()
export class MatterSuggestionService {
  constructor(private readonly prisma: PrismaService) {}

  async suggest(
    sender: string,
    subject: string,
    bodyText?: string | null,
  ): Promise<MatterSuggestion> {
    const fromRef = await this.suggestFromClientRef(subject, bodyText);
    if (fromRef.suggestedMatterId || fromRef.suggestedClientId) return fromRef;

    const senderEmail = this.extractEmail(sender);
    if (!senderEmail) {
      return {
        suggestedMatterId: null,
        suggestedClientId: null,
        suggestionReason: null,
      };
    }

    const contact = await this.prisma.contact.findFirst({
      where: {
        email: { equals: senderEmail, mode: 'insensitive' },
        isActive: true,
      },
      select: { clientId: true },
    });
    if (!contact) {
      return {
        suggestedMatterId: null,
        suggestedClientId: null,
        suggestionReason: null,
      };
    }

    const matters = await this.prisma.matter.findMany({
      where: {
        clientId: contact.clientId,
        status: { in: ACTIVE_MATTER_STATUSES },
      },
      select: { id: true, title: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (matters.length === 1) {
      return {
        suggestedMatterId: matters[0].id,
        suggestedClientId: contact.clientId,
        suggestionReason: 'single_active_matter',
      };
    }

    if (matters.length > 1) {
      return {
        suggestedMatterId: matters[0].id,
        suggestedClientId: contact.clientId,
        suggestionReason: 'contact_match',
      };
    }

    return {
      suggestedMatterId: null,
      suggestedClientId: contact.clientId,
      suggestionReason: 'contact_client_only',
    };
  }

  private async suggestFromClientRef(
    subject: string,
    bodyText?: string | null,
  ): Promise<MatterSuggestion> {
    const empty = {
      suggestedMatterId: null,
      suggestedClientId: null,
      suggestionReason: null,
    };
    const internalCode = extractClientRef(subject, bodyText);
    if (!internalCode) return empty;

    const inSubject = extractClientRef(subject, null) != null;
    const client = await this.prisma.client.findFirst({
      where: { internalCode },
      select: { id: true },
    });
    if (!client) return empty;

    const matter = await this.prisma.matter.findFirst({
      where: {
        clientId: client.id,
        status: { in: ACTIVE_MATTER_STATUSES },
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

    if (!matter) {
      return {
        suggestedMatterId: null,
        suggestedClientId: client.id,
        suggestionReason: inSubject ? 'subject_ref_client' : 'body_ref_client',
      };
    }

    return {
      suggestedMatterId: matter.id,
      suggestedClientId: client.id,
      suggestionReason: inSubject ? 'subject_ref' : 'body_ref',
    };
  }

  private extractEmail(value: string): string | null {
    const angle = value.match(/<([^>]+)>/);
    if (angle?.[1]?.includes('@')) return angle[1].trim().toLowerCase();
    const plain = value.trim();
    if (plain.includes('@')) return plain.toLowerCase();
    return null;
  }
}
