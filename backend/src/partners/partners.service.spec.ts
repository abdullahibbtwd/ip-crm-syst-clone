import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PartnersService } from './partners.service';

describe('PartnersService', () => {
  let service: PartnersService;
  let prisma: {
    partner: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      partner: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
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

  it('findById returns partner when present', async () => {
    prisma.partner.findUnique.mockResolvedValue({ id: 'p1', name: 'Agent' });
    await expect(service.findById('p1')).resolves.toEqual({
      id: 'p1',
      name: 'Agent',
    });
  });

  it('list filters active partners and search', async () => {
    prisma.partner.findMany.mockResolvedValue([]);
    await service.list({ activeOnly: true, search: ' acme ' });
    expect(prisma.partner.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
        OR: [
          { name: { contains: 'acme', mode: 'insensitive' } },
          { company: { contains: 'acme', mode: 'insensitive' } },
          { email: { contains: 'acme', mode: 'insensitive' } },
        ],
      },
      orderBy: [{ name: 'asc' }],
    });
  });

  it('list without filters returns all partners', async () => {
    prisma.partner.findMany.mockResolvedValue([{ id: 'p1' }]);
    await expect(service.list()).resolves.toEqual([{ id: 'p1' }]);
    expect(prisma.partner.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ name: 'asc' }],
    });
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

  it('create clears optional blank fields to null', async () => {
    prisma.partner.create.mockResolvedValue({ id: 'p2' });
    await service.create({ name: 'Agent', company: '  ', email: '' });
    expect(prisma.partner.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company: null,
        email: null,
        phone: null,
        notes: null,
        countryCode: null,
        jurisdictions: [],
      }),
    });
  });

  it('update clears nullable fields and uppercases country', async () => {
    prisma.partner.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.partner.update.mockResolvedValue({ id: 'p1' });

    await service.update('p1', {
      company: '',
      email: undefined,
      countryCode: ' de ',
      notes: ' keep ',
    });

    expect(prisma.partner.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: expect.objectContaining({
        company: null,
        email: undefined,
        countryCode: 'DE',
        notes: 'keep',
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
