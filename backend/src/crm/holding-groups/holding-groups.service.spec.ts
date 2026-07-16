import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HoldingGroupsService } from './holding-groups.service';

describe('HoldingGroupsService', () => {
  let service: HoldingGroupsService;
  let prisma: {
    holdingGroup: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      holdingGroup: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new HoldingGroupsService(prisma as unknown as PrismaService);
  });

  it('create persists the dto', async () => {
    prisma.holdingGroup.create.mockResolvedValue({ id: 'hg1' });
    await service.create({ name: 'Acme Holdings' });
    expect(prisma.holdingGroup.create).toHaveBeenCalledWith({
      data: { name: 'Acme Holdings' },
    });
  });

  it('findOne throws when missing', async () => {
    prisma.holdingGroup.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findAll returns cursor when more rows exist', async () => {
    prisma.holdingGroup.findMany.mockResolvedValue([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);

    const result = await service.findAll({ limit: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe('a');
  });
});
