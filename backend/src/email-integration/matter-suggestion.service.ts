import { Injectable } from '@nestjs/common';
import { MatterStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type MatterSuggestion = {
  suggestedMatterId: string | null;
  suggestionReason: string | null;
};

const ACTIVE_MATTER_STATUSES: MatterStatus[] = [
  MatterStatus.draft,
  MatterStatus.active,
  MatterStatus.on_hold,
];

const CLIENT_REF_PATTERN = /\b(CL-\d{4}-\d{3})\b/i;

@Injectable()
export class MatterSuggestionService {
  constructor(private readonly prisma: PrismaService) {}

  async suggest(sender: string, subject: string): Promise<MatterSuggestion> {
    const fromSubject = await this.suggestFromSubject(subject);
    if (fromSubject.suggestedMatterId) return fromSubject;

    const senderEmail = this.extractEmail(sender);
    if (!senderEmail) return { suggestedMatterId: null, suggestionReason: null };

    const contact = await this.prisma.contact.findFirst({
      where: {
        email: { equals: senderEmail, mode: 'insensitive' },
        isActive: true,
      },
      select: { clientId: true },
    });
    if (!contact) return { suggestedMatterId: null, suggestionReason: null };

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
        suggestionReason: 'single_active_matter',
      };
    }

    if (matters.length > 1) {
      return {
        suggestedMatterId: matters[0].id,
        suggestionReason: 'contact_match',
      };
    }

    return { suggestedMatterId: null, suggestionReason: null };
  }

  private async suggestFromSubject(subject: string): Promise<MatterSuggestion> {
    const match = subject.match(CLIENT_REF_PATTERN);
    if (!match) return { suggestedMatterId: null, suggestionReason: null };

    const internalCode = match[1].toUpperCase();
    const client = await this.prisma.client.findFirst({
      where: { internalCode },
      select: { id: true },
    });
    if (!client) return { suggestedMatterId: null, suggestionReason: null };

    const matter = await this.prisma.matter.findFirst({
      where: {
        clientId: client.id,
        status: { in: ACTIVE_MATTER_STATUSES },
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });

    if (!matter) return { suggestedMatterId: null, suggestionReason: null };

    return {
      suggestedMatterId: matter.id,
      suggestionReason: 'subject_ref',
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
