import { HoldingGroupsController } from './holding-groups.controller';
import type { HoldingGroupsService } from './holding-groups.service';

describe('HoldingGroupsController', () => {
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const controller = new HoldingGroupsController(
    service as unknown as HoldingGroupsService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('create / findAll / findOne / update forward args', async () => {
    const createDto = { name: 'Group' };
    const query = { search: 'g' };
    const updateDto = { name: 'G2' };

    await controller.create(createDto as never);
    await controller.findAll(query as never);
    await controller.findOne('hg1');
    await controller.update('hg1', updateDto as never);

    expect(service.create).toHaveBeenCalledWith(createDto);
    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(service.findOne).toHaveBeenCalledWith('hg1');
    expect(service.update).toHaveBeenCalledWith('hg1', updateDto);
  });
});
