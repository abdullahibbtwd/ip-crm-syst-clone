import {
  AuditController,
  ComplianceController,
} from './audit.controller';
import type { AuditService } from './audit.service';

describe('Audit controllers', () => {
  const auditService = {
    query: jest.fn(),
    queryPersonalDataExports: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('AuditController forwards query fields', async () => {
    const c = new AuditController(auditService as unknown as AuditService);
    const query = {
      userId: 'u1',
      resource: 'client',
      module: 'crm',
      action: 'read',
      from: '2026-01-01',
      to: '2026-12-31',
      cursor: 'cur',
      limit: '25',
    };

    await c.findAll(query as never);
    expect(auditService.query).toHaveBeenCalledWith({
      userId: 'u1',
      resource: 'client',
      module: 'crm',
      action: 'read',
      from: '2026-01-01',
      to: '2026-12-31',
      cursor: 'cur',
      limit: 25,
    });
  });

  it('ComplianceController parses limit and forwards clientId', async () => {
    const c = new ComplianceController(
      auditService as unknown as AuditService,
    );

    await c.listDataExports('c1', 'cur', '10');
    expect(auditService.queryPersonalDataExports).toHaveBeenCalledWith({
      clientId: 'c1',
      cursor: 'cur',
      limit: 10,
    });
  });
});
