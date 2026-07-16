import { RetentionRulesController } from './retention-rules.controller';
import type { RetentionRulesService } from './retention-rules.service';

describe('RetentionRulesController', () => {
  const rules = {
    list: jest.fn(),
    dryRun: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };

  const controller = new RetentionRulesController(
    rules as unknown as RetentionRulesService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('list / findOne / dryRun forward id', async () => {
    await controller.list();
    await controller.findOne('r1');
    await controller.dryRun('r1');

    expect(rules.list).toHaveBeenCalled();
    expect(rules.findById).toHaveBeenCalledWith('r1');
    expect(rules.dryRun).toHaveBeenCalledWith('r1');
  });

  it('create / update / deactivate forward args', async () => {
    const createDto = { name: '7-year rule', retentionDays: 2555 };
    const updateDto = { retentionDays: 3650 };

    await controller.create(createDto as never);
    await controller.update('r1', updateDto as never);
    await controller.deactivate('r1');

    expect(rules.create).toHaveBeenCalledWith(createDto);
    expect(rules.update).toHaveBeenCalledWith('r1', updateDto);
    expect(rules.deactivate).toHaveBeenCalledWith('r1');
  });
});
