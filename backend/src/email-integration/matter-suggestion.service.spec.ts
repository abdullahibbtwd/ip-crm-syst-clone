import { MatterStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatterSuggestionService } from './matter-suggestion.service';

describe('MatterSuggestionService', () => {
  let service: MatterSuggestionService;
  let prisma: {
    contact: { findFirst: jest.Mock };
    matter: { findMany: jest.Mock; findFirst: jest.Mock };
    client: { findFirst: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      contact: { findFirst: jest.fn() },
      matter: { findMany: jest.fn(), findFirst: jest.fn() },
      client: { findFirst: jest.fn() },
    };
    service = new MatterSuggestionService(prisma as unknown as PrismaService);
  });

  it('suggests from client ref in subject', async () => {
    prisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
    prisma.matter.findFirst.mockResolvedValue({ id: 'matter-1' });

    await expect(
      service.suggest('sender@example.com', 'Re: CL-2026-042 office action'),
    ).resolves.toEqual({
      suggestedMatterId: 'matter-1',
      suggestedClientId: 'client-1',
      suggestionReason: 'subject_ref',
    });
  });

  it('suggests from client ref in body when not in subject', async () => {
    prisma.client.findFirst.mockResolvedValue({ id: 'client-1' });
    prisma.matter.findFirst.mockResolvedValue({ id: 'matter-1' });

    await expect(
      service.suggest('sender@example.com', 'Hello', 'Please see CL-2026-042'),
    ).resolves.toEqual({
      suggestedMatterId: 'matter-1',
      suggestedClientId: 'client-1',
      suggestionReason: 'body_ref',
    });
  });

  it('suggests single active matter for known contact', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    prisma.contact.findFirst.mockResolvedValue({ clientId: 'client-1' });
    prisma.matter.findMany.mockResolvedValue([{ id: 'matter-1', title: 'Only' }]);

    await expect(
      service.suggest('Ada <ada@client.com>', 'Status update'),
    ).resolves.toEqual({
      suggestedMatterId: 'matter-1',
      suggestedClientId: 'client-1',
      suggestionReason: 'single_active_matter',
    });

    expect(prisma.contact.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          email: { equals: 'ada@client.com', mode: 'insensitive' },
          isActive: true,
        }),
      }),
    );
  });

  it('returns contact_match when multiple active matters exist', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    prisma.contact.findFirst.mockResolvedValue({ clientId: 'client-1' });
    prisma.matter.findMany.mockResolvedValue([
      { id: 'matter-new', title: 'Newest' },
      { id: 'matter-old', title: 'Older' },
    ]);

    await expect(
      service.suggest('client@example.com', 'Question'),
    ).resolves.toEqual({
      suggestedMatterId: 'matter-new',
      suggestedClientId: 'client-1',
      suggestionReason: 'contact_match',
    });
  });

  it('returns null when no match is found', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    prisma.contact.findFirst.mockResolvedValue(null);

    await expect(
      service.suggest('unknown@example.com', 'Hello'),
    ).resolves.toEqual({
      suggestedMatterId: null,
      suggestedClientId: null,
      suggestionReason: null,
    });

    expect(prisma.matter.findMany).not.toHaveBeenCalled();
  });

  it('queries active matter statuses for contact matches', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    prisma.contact.findFirst.mockResolvedValue({ clientId: 'client-1' });
    prisma.matter.findMany.mockResolvedValue([]);

    await service.suggest('client@example.com', 'Hello');

    expect(prisma.matter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          clientId: 'client-1',
          status: {
            in: [MatterStatus.draft, MatterStatus.active, MatterStatus.on_hold],
          },
        },
      }),
    );
  });
});
