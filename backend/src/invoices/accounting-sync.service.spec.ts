import { BadRequestException } from '@nestjs/common';
import { InvoiceStatus } from '../../generated/prisma/client';
import type { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  INTEGRATION_SECRET_KEYS,
  SYSTEM_SECRET_CATEGORY,
} from '../secrets/secrets.constants';
import type { SystemSecretsService } from '../secrets/system-secrets.service';
import { AccountingSyncService } from './accounting-sync.service';

describe('AccountingSyncService', () => {
  let service: AccountingSyncService;
  let prisma: { invoice: { findMany: jest.Mock } };
  let secrets: {
    getStatuses: jest.Mock;
    upsertNonSecret: jest.Mock;
    upsertSecret: jest.Mock;
    deleteSecret: jest.Mock;
    getSecretValue: jest.Mock;
  };
  let audit: { log: jest.Mock };
  const fetchMock = jest.fn();

  const statusRow = (overrides: Record<string, unknown> = {}) => ({
    configured: false,
    nonSecretValue: null,
    lastFour: null,
    updatedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;

    prisma = { invoice: { findMany: jest.fn() } };
    secrets = {
      getStatuses: jest.fn(),
      upsertNonSecret: jest.fn(),
      upsertSecret: jest.fn(),
      deleteSecret: jest.fn(),
      getSecretValue: jest.fn(),
    };
    audit = { log: jest.fn() };

    service = new AccountingSyncService(
      prisma as unknown as PrismaService,
      secrets as unknown as SystemSecretsService,
      audit as unknown as AuditService,
    );
  });

  it('getProviderStatus reports configured xero integration', async () => {
    secrets.getStatuses.mockResolvedValue([
      statusRow({ configured: true, nonSecretValue: 'client-id' }),
      statusRow({ configured: true, lastFour: '1234' }),
      statusRow({ configured: true, lastFour: 'abcd' }),
      statusRow({ configured: true, nonSecretValue: 'tenant-1' }),
      statusRow({ nonSecretValue: '2026-01-01T00:00:00.000Z' }),
    ]);

    await expect(service.getProviderStatus('xero')).resolves.toMatchObject({
      provider: 'xero',
      configured: true,
      orgId: 'tenant-1',
      lastSyncAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('upsertCredentials stores secrets and returns status', async () => {
    secrets.getStatuses.mockResolvedValue([
      statusRow({ configured: true, nonSecretValue: 'id' }),
      statusRow({ configured: true }),
      statusRow({ configured: true }),
      statusRow({ configured: true, nonSecretValue: 'tenant' }),
      statusRow(),
    ]);

    await service.upsertCredentials(
      'xero',
      {
        clientId: ' new-id ',
        clientSecret: ' secret ',
        accessToken: ' token ',
        orgId: ' tenant ',
      },
      'u1',
    );

    expect(secrets.upsertNonSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        key: INTEGRATION_SECRET_KEYS.XERO_CLIENT_ID,
        value: 'new-id',
        updatedById: 'u1',
      }),
    );
    expect(secrets.upsertSecret).toHaveBeenCalledWith(
      expect.objectContaining({
        key: INTEGRATION_SECRET_KEYS.XERO_CLIENT_SECRET,
        plaintext: 'secret',
      }),
    );
  });

  it('clearCredentials deletes all provider keys', async () => {
    secrets.getStatuses.mockResolvedValue([
      statusRow(),
      statusRow(),
      statusRow(),
      statusRow(),
      statusRow(),
    ]);

    await service.clearCredentials('quickbooks');

    expect(secrets.deleteSecret).toHaveBeenCalledWith(
      SYSTEM_SECRET_CATEGORY.INTEGRATION,
      INTEGRATION_SECRET_KEYS.QUICKBOOKS_REALM_ID,
    );
  });

  it('syncProvider rejects unconfigured providers', async () => {
    secrets.getStatuses.mockResolvedValue([
      statusRow(),
      statusRow(),
      statusRow({ configured: false }),
      statusRow(),
      statusRow(),
    ]);

    await expect(service.syncProvider('xero')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('syncProvider pushes issued invoices to xero', async () => {
    secrets.getStatuses.mockResolvedValue([
      statusRow({ configured: true, nonSecretValue: 'id' }),
      statusRow({ configured: true }),
      statusRow({ configured: true }),
      statusRow({ configured: true, nonSecretValue: 'tenant-1' }),
      statusRow(),
    ]);
    secrets.getSecretValue.mockResolvedValue('access-token');
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        invoiceNumber: 'INV-2026-0001',
        issueDate: new Date('2026-01-15'),
        dueDate: new Date('2026-02-15'),
        currency: 'EUR',
        subtotal: 100,
        taxAmount: 0,
        client: {
          id: 'c1',
          companyName: 'Acme',
          firstName: null,
          lastName: null,
          internalCode: 'CL-1',
        },
        matter: { id: 'm1', title: 'Trademark' },
        fixedFees: [{ description: 'Official fee', amount: 100 }],
        timeEntries: [],
      },
    ]);
    fetchMock.mockResolvedValue({ ok: true, text: async () => '' });

    const result = await service.syncProvider('xero', 'u1');

    expect(result).toMatchObject({
      provider: 'xero',
      attempted: 1,
      succeeded: 1,
      failed: 0,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.xero.com/api.xro/2.0/Invoices',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          'Xero-tenant-id': 'tenant-1',
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'accounting.sync',
        resource: 'xero',
        userId: 'u1',
      }),
    );
  });

  it('syncProvider creates quickbooks customer when missing', async () => {
    secrets.getStatuses.mockResolvedValue([
      statusRow({ configured: true, nonSecretValue: 'id' }),
      statusRow({ configured: true }),
      statusRow({ configured: true }),
      statusRow({ configured: true, nonSecretValue: 'realm-1' }),
      statusRow(),
    ]);
    secrets.getSecretValue.mockResolvedValue('qb-token');
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: 'inv-2',
        invoiceNumber: 'INV-2026-0002',
        issueDate: new Date('2026-01-20'),
        dueDate: null,
        currency: 'EUR',
        subtotal: 200,
        taxAmount: 40,
        client: {
          id: 'c2',
          companyName: 'Beta Ltd',
          firstName: null,
          lastName: null,
          internalCode: 'CL-2',
        },
        matter: { id: 'm2', title: 'Patent' },
        fixedFees: [],
        timeEntries: [
          {
            description: 'Drafting',
            hours: 2,
            rateSnapshot: 100,
            amount: 200,
          },
        ],
      },
    ]);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ QueryResponse: { Customer: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ Customer: { Id: 'cust-1' } }),
      })
      .mockResolvedValueOnce({ ok: true, text: async () => '' });

    const result = await service.syncProvider('quickbooks');

    expect(result.succeeded).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: InvoiceStatus.issued }),
      }),
    );
  });

  it('syncProvider records per-invoice failures without aborting batch', async () => {
    secrets.getStatuses.mockResolvedValue([
      statusRow({ configured: true, nonSecretValue: 'id' }),
      statusRow({ configured: true }),
      statusRow({ configured: true }),
      statusRow({ configured: true, nonSecretValue: 'tenant-1' }),
      statusRow(),
    ]);
    secrets.getSecretValue.mockResolvedValue('access-token');
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        invoiceNumber: 'INV-1',
        issueDate: new Date('2026-01-01'),
        dueDate: null,
        currency: 'EUR',
        subtotal: 50,
        taxAmount: 0,
        client: {
          id: 'c1',
          companyName: 'Acme',
          firstName: null,
          lastName: null,
          internalCode: 'CL-1',
        },
        matter: { id: 'm1', title: 'Matter' },
        fixedFees: [],
        timeEntries: [],
      },
    ]);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'upstream error',
    });

    const result = await service.syncProvider('xero');

    expect(result).toMatchObject({
      attempted: 1,
      succeeded: 0,
      failed: 1,
    });
    expect(result.results[0]).toMatchObject({ ok: false, error: expect.any(String) });
    expect(secrets.upsertNonSecret).not.toHaveBeenCalled();
  });

  it('getProviderStatus reports quickbooks integration', async () => {
    secrets.getStatuses.mockResolvedValue([
      statusRow({ configured: true, nonSecretValue: 'qb-client' }),
      statusRow({ configured: true }),
      statusRow({ configured: true }),
      statusRow({ configured: true, nonSecretValue: 'realm-9' }),
      statusRow({ nonSecretValue: '2026-02-01T00:00:00.000Z' }),
    ]);

    await expect(service.getProviderStatus('quickbooks')).resolves.toMatchObject({
      provider: 'quickbooks',
      configured: true,
      orgId: 'realm-9',
    });
  });

  it('syncProvider reuses existing quickbooks customer', async () => {
    secrets.getStatuses.mockResolvedValue([
      statusRow({ configured: true, nonSecretValue: 'id' }),
      statusRow({ configured: true }),
      statusRow({ configured: true }),
      statusRow({ configured: true, nonSecretValue: 'realm-1' }),
      statusRow(),
    ]);
    secrets.getSecretValue.mockResolvedValue('qb-token');
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: 'inv-3',
        invoiceNumber: 'INV-2026-0003',
        issueDate: new Date('2026-01-10'),
        dueDate: null,
        currency: 'EUR',
        subtotal: 150,
        taxAmount: 0,
        client: {
          id: 'c3',
          companyName: 'Gamma',
          firstName: null,
          lastName: null,
          internalCode: 'CL-3',
        },
        matter: { id: 'm3', title: 'Design' },
        fixedFees: [],
        timeEntries: [],
      },
    ]);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          QueryResponse: { Customer: [{ Id: 'cust-existing' }] },
        }),
      })
      .mockResolvedValueOnce({ ok: true, text: async () => '' });

    const result = await service.syncProvider('quickbooks');

    expect(result.succeeded).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  describe('extended branch coverage', () => {
    it('getProviderStatus reports unconfigured provider', async () => {
      secrets.getStatuses.mockResolvedValue([
        statusRow(),
        statusRow(),
        statusRow(),
        statusRow(),
        statusRow(),
      ]);
      await expect(service.getProviderStatus('xero')).resolves.toMatchObject({
        configured: false,
      });
    });

    it('upsertCredentials clears clientId when blank string provided', async () => {
      secrets.getStatuses.mockResolvedValue([
        statusRow(),
        statusRow(),
        statusRow(),
        statusRow(),
        statusRow(),
      ]);
      await service.upsertCredentials('xero', { clientId: '   ' }, 'u1');
      expect(secrets.deleteSecret).toHaveBeenCalledWith(
        SYSTEM_SECRET_CATEGORY.INTEGRATION,
        INTEGRATION_SECRET_KEYS.XERO_CLIENT_ID,
      );
    });

    it('upsertCredentials clears orgId when blank string provided', async () => {
      secrets.getStatuses.mockResolvedValue([
        statusRow(),
        statusRow(),
        statusRow(),
        statusRow(),
        statusRow(),
      ]);
      await service.upsertCredentials('quickbooks', { orgId: '' }, 'u1');
      expect(secrets.deleteSecret).toHaveBeenCalledWith(
        SYSTEM_SECRET_CATEGORY.INTEGRATION,
        INTEGRATION_SECRET_KEYS.QUICKBOOKS_REALM_ID,
      );
    });

    it('syncProvider rejects incomplete credentials after status check', async () => {
      secrets.getStatuses.mockResolvedValue([
        statusRow({ configured: true, nonSecretValue: 'id' }),
        statusRow({ configured: true }),
        statusRow({ configured: true }),
        statusRow({ configured: true, nonSecretValue: 'tenant' }),
        statusRow(),
      ]);
      secrets.getSecretValue.mockResolvedValue(null);
      await expect(service.syncProvider('xero')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('syncProvider uses incremental filter when lastSyncAt is set', async () => {
      secrets.getStatuses.mockResolvedValue([
        statusRow({ configured: true, nonSecretValue: 'id' }),
        statusRow({ configured: true }),
        statusRow({ configured: true }),
        statusRow({ configured: true, nonSecretValue: 'tenant-1' }),
        statusRow({ nonSecretValue: '2026-01-01T00:00:00.000Z' }),
      ]);
      secrets.getSecretValue.mockResolvedValue('access-token');
      prisma.invoice.findMany.mockResolvedValue([]);
      await service.syncProvider('xero');
      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });

    it('syncProvider builds fallback line item from subtotal when invoice has no lines', async () => {
      secrets.getStatuses.mockResolvedValue([
        statusRow({ configured: true, nonSecretValue: 'id' }),
        statusRow({ configured: true }),
        statusRow({ configured: true }),
        statusRow({ configured: true, nonSecretValue: 'tenant-1' }),
        statusRow(),
      ]);
      secrets.getSecretValue.mockResolvedValue('access-token');
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-empty',
          invoiceNumber: 'INV-EMPTY',
          issueDate: new Date('2026-01-01'),
          dueDate: null,
          currency: 'EUR',
          subtotal: 300,
          taxAmount: 0,
          client: {
            id: 'c1',
            companyName: null,
            firstName: 'Ada',
            lastName: 'Lovelace',
            internalCode: 'CL-ADA',
          },
          matter: { id: 'm1', title: 'Fallback matter' },
          fixedFees: [],
          timeEntries: [],
        },
      ]);
      fetchMock.mockResolvedValue({ ok: true, text: async () => '' });

      const result = await service.syncProvider('xero');
      expect(result.succeeded).toBe(1);
      const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
      expect(body.Invoices[0].LineItems[0].Description).toBe('Fallback matter');
    });

    it('syncProvider applies OUTPUT2 tax type when taxAmount is positive', async () => {
      secrets.getStatuses.mockResolvedValue([
        statusRow({ configured: true, nonSecretValue: 'id' }),
        statusRow({ configured: true }),
        statusRow({ configured: true }),
        statusRow({ configured: true, nonSecretValue: 'tenant-1' }),
        statusRow(),
      ]);
      secrets.getSecretValue.mockResolvedValue('access-token');
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-tax',
          invoiceNumber: 'INV-TAX',
          issueDate: new Date('2026-01-01'),
          dueDate: new Date('2026-02-01'),
          currency: 'EUR',
          subtotal: 100,
          taxAmount: 19,
          client: {
            id: 'c1',
            companyName: 'Acme',
            firstName: null,
            lastName: null,
            internalCode: 'CL-1',
          },
          matter: { id: 'm1', title: 'Tax matter' },
          fixedFees: [{ description: 'Fee', amount: 100 }],
          timeEntries: [],
        },
      ]);
      fetchMock.mockResolvedValue({ ok: true, text: async () => '' });

      await service.syncProvider('xero');
      const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
      expect(body.Invoices[0].LineItems[0].TaxType).toBe('OUTPUT2');
    });

    it('syncProvider does not update lastSyncAt when all invoices fail', async () => {
      secrets.getStatuses.mockResolvedValue([
        statusRow({ configured: true, nonSecretValue: 'id' }),
        statusRow({ configured: true }),
        statusRow({ configured: true }),
        statusRow({ configured: true, nonSecretValue: 'tenant-1' }),
        statusRow(),
      ]);
      secrets.getSecretValue.mockResolvedValue('access-token');
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-1',
          issueDate: new Date('2026-01-01'),
          dueDate: null,
          currency: 'EUR',
          subtotal: 50,
          taxAmount: 0,
          client: {
            id: 'c1',
            companyName: 'Acme',
            firstName: null,
            lastName: null,
            internalCode: 'CL-1',
          },
          matter: { id: 'm1', title: 'Matter' },
          fixedFees: [],
          timeEntries: [],
        },
      ]);
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'upstream error',
      });

      await service.syncProvider('xero');
      expect(secrets.upsertNonSecret).not.toHaveBeenCalled();
    });

    it('syncProvider throws when quickbooks customer create returns no id', async () => {
      secrets.getStatuses.mockResolvedValue([
        statusRow({ configured: true, nonSecretValue: 'id' }),
        statusRow({ configured: true }),
        statusRow({ configured: true }),
        statusRow({ configured: true, nonSecretValue: 'realm-1' }),
        statusRow(),
      ]);
      secrets.getSecretValue.mockResolvedValue('qb-token');
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-qb',
          invoiceNumber: 'INV-QB',
          issueDate: new Date('2026-01-01'),
          dueDate: null,
          currency: 'EUR',
          subtotal: 100,
          taxAmount: 0,
          client: {
            id: 'c1',
            companyName: 'New Co',
            firstName: null,
            lastName: null,
            internalCode: 'CL-N',
          },
          matter: { id: 'm1', title: 'QB matter' },
          fixedFees: [],
          timeEntries: [],
        },
      ]);
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ QueryResponse: { Customer: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ Customer: {} }),
        });

      const result = await service.syncProvider('quickbooks');
      expect(result.failed).toBe(1);
      expect(result.results[0]?.ok).toBe(false);
    });
  });
});
