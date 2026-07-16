import { RelationshipEventType } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { HistoryService } from './history.service';

describe('HistoryService', () => {
  let service: HistoryService;
  let prisma: {
    relationshipHistory: { create: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      relationshipHistory: { create: jest.fn(), findMany: jest.fn() },
    };
    service = new HistoryService(prisma as unknown as PrismaService);
  });

  it('log maps nullable fields into create data', async () => {
    prisma.relationshipHistory.create.mockResolvedValue({ id: 'h1' });

    await service.log({
      clientId: 'c1',
      eventType: RelationshipEventType.created,
    });

    expect(prisma.relationshipHistory.create).toHaveBeenCalledWith({
      data: {
        clientId: 'c1',
        userId: null,
        eventType: RelationshipEventType.created,
        description: null,
        metadata: undefined,
      },
    });
  });

  it('findByClient paginates with nextCursor', async () => {
    prisma.relationshipHistory.findMany.mockResolvedValue([
      { id: 'a' },
      { id: 'b' },
    ]);

    const result = await service.findByClient('c1', { limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe('a');
  });
});
