import { PartnersController } from './partners.controller';
import type { PartnersService } from './partners.service';

describe('PartnersController', () => {
  const partners = {
    list: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };

  const controller = new PartnersController(
    partners as unknown as PartnersService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('list forwards query', async () => {
    const query = { search: 'acme' };
    await controller.list(query as never);
    expect(partners.list).toHaveBeenCalledWith(query);
  });

  it('findOne forwards id', async () => {
    await controller.findOne('p1');
    expect(partners.findById).toHaveBeenCalledWith('p1');
  });

  it('create / update / deactivate forward args', async () => {
    const createDto = { name: 'Partner A' };
    const updateDto = { name: 'Partner B' };

    await controller.create(createDto as never);
    await controller.update('p1', updateDto as never);
    await controller.deactivate('p1');

    expect(partners.create).toHaveBeenCalledWith(createDto);
    expect(partners.update).toHaveBeenCalledWith('p1', updateDto);
    expect(partners.deactivate).toHaveBeenCalledWith('p1');
  });
});
