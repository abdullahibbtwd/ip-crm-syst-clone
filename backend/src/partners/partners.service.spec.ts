import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PartnersService } from './partners.service';

describe('PartnersService', () => {
  let service: PartnersService;
  let prisma: {
    partner: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      partner: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new PartnersService(prisma as unknown as PrismaService);
  });

  it('findById throws when missing', async () => {
    prisma.partner.findUnique.mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create uppercases jurisdictions and country', async () => {
    prisma.partner.create.mockResolvedValue({ id: 'p1' });

    await service.create({
      name: ' Local Agent ',
      countryCode: 'bg',
      jurisdictions: [' eu ', 'ep'],
    });

    expect(prisma.partner.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Local Agent',
        countryCode: 'BG',
        jurisdictions: ['EU', 'EP'],
        isActive: true,
      }),
    });
  });

  it('deactivate soft-sets isActive false', async () => {
    prisma.partner.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.partner.update.mockResolvedValue({ id: 'p1', isActive: false });

    await service.deactivate('p1');

    expect(prisma.partner.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { isActive: false },
    });
  });
});
