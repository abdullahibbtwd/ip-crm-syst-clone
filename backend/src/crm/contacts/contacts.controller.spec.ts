import type { Request } from 'express';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { ContactsController } from './contacts.controller';
import type { ContactsService } from './contacts.service';
import { ContactRole } from '../../../generated/prisma/client';

describe('ContactsController', () => {
  const contactsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };
  const controller = new ContactsController(
    contactsService as unknown as ContactsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('create forwards clientId, dto, and userId', async () => {
    const dto = {
      role: ContactRole.general,
      firstName: 'Ada',
      lastName: 'Lovelace',
    };
    const req = {
      user: { userId: 'u1' } as AuthenticatedUser,
    } as Request;

    await controller.create('c1', dto, req);

    expect(contactsService.create).toHaveBeenCalledWith('c1', dto, 'u1');
  });

  it('findAll forwards clientId and query', async () => {
    await controller.findAll('c1', { role: ContactRole.billing });
    expect(contactsService.findAll).toHaveBeenCalledWith('c1', {
      role: ContactRole.billing,
    });
  });

  it('update forwards ids, dto, and userId', async () => {
    const dto = { firstName: 'Grace' };
    const req = {
      user: { userId: 'u2' } as AuthenticatedUser,
    } as Request;

    await controller.update('c1', 'ct1', dto, req);

    expect(contactsService.update).toHaveBeenCalledWith(
      'c1',
      'ct1',
      dto,
      'u2',
    );
  });

  it('deactivate forwards ids', async () => {
    await controller.deactivate('c1', 'ct1');
    expect(contactsService.deactivate).toHaveBeenCalledWith('c1', 'ct1');
  });
});
