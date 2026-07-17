import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentStatus,
  RetainerEntryType,
} from '../../generated/prisma/client';
import type { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { PrismaService } from '../prisma/prisma.service';
import { RetainersService } from './retainers.service';

describe('RetainersService', () => {
  let service: RetainersService;
  let notifications: { dispatch: jest.Mock };
  let prisma: {
    client: { findUnique: jest.Mock };
    clientRetainerAccount: {
      upsert: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    retainerLedgerEntry: { create: jest.Mock; findMany: jest.Mock };
    invoice: { findUnique: jest.Mock; update: jest.Mock };
    invoicePayment: { create: jest.Mock };
    user: { findMany: jest.Mock; findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    notifications = { dispatch: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      client: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }) },
      clientRetainerAccount: {
        upsert: jest.fn().mockResolvedValue({
          id: 'acc1',
          clientId: 'c1',
          balance: 100,
          currency: 'EUR',
          lowBalanceThreshold: null,
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'acc1',
          balance: 100,
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'acc1',
          clientId: 'c1',
          balance: 100,
          currency: 'EUR',
          lowBalanceThreshold: null,
          client: {
            companyName: 'Acme',
            firstName: null,
            lastName: null,
            internalCode: 'CL-1',
            assignedUserId: null,
          },
        }),
        update: jest.fn(),
      },
      retainerLedgerEntry: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      invoice: { findUnique: jest.fn(), update: jest.fn() },
      invoicePayment: { create: jest.fn() },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    service = new RetainersService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationDispatchService,
    );
  });

  describe('getByClientId', () => {
    it('throws when client is missing', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(service.getByClientId('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns account summary with recent entries', async () => {
      prisma.retainerLedgerEntry.findMany.mockResolvedValue([
        {
          id: 'e1',
          type: RetainerEntryType.deposit,
          amount: 50,
          balanceAfter: 150,
          invoiceId: null,
          invoice: null,
          note: 'Top up',
          createdBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
          createdAt: new Date(),
        },
      ]);

      const result = await service.getByClientId('c1');

      expect(result.clientId).toBe('c1');
      expect(result.balance).toBe(100);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].amount).toBe(50);
    });
  });

  describe('getPortalBalance', () => {
    it('returns zero balance when no account exists', async () => {
      prisma.clientRetainerAccount.findUnique.mockResolvedValue(null);
      const result = await service.getPortalBalance('c1');
      expect(result).toEqual({
        clientId: 'c1',
        currency: 'EUR',
        balance: 0,
        entries: [],
      });
    });

    it('returns balance and recent portal entries', async () => {
      prisma.clientRetainerAccount.findUnique.mockResolvedValue({
        id: 'acc1',
        clientId: 'c1',
        balance: 75,
        currency: 'EUR',
      });
      prisma.retainerLedgerEntry.findMany.mockResolvedValue([
        {
          id: 'e1',
          type: RetainerEntryType.draw_down,
          amount: -25,
          balanceAfter: 75,
          createdAt: new Date(),
          invoice: { invoiceNumber: 'INV-1' },
        },
      ]);

      const result = await service.getPortalBalance('c1');

      expect(result.balance).toBe(75);
      expect(result.entries[0].invoiceNumber).toBe('INV-1');
    });
  });

  describe('recordAdjustment', () => {
    it('rejects zero amount', async () => {
      await expect(
        service.recordAdjustment('c1', { amount: 0, note: 'noop' }, 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects adjustments that would make balance negative', async () => {
      prisma.clientRetainerAccount.findUniqueOrThrow.mockResolvedValue({
        id: 'acc1',
        balance: 50,
      });

      await expect(
        service.recordAdjustment(
          'c1',
          { amount: -100, note: 'too much' },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('writes a ledger entry and updates balance', async () => {
      prisma.clientRetainerAccount.findUniqueOrThrow.mockResolvedValue({
        id: 'acc1',
        balance: 100,
      });

      await service.recordAdjustment(
        'c1',
        { amount: -20, note: 'Correction' },
        'u1',
      );

      expect(prisma.retainerLedgerEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: RetainerEntryType.adjustment,
          amount: -20,
          balanceAfter: 80,
          note: 'Correction',
        }),
      });
    });
  });

  describe('recordDeposit', () => {
    it('credits the account and writes a ledger entry', async () => {
      const result = await service.recordDeposit(
        'c1',
        { amount: 25, note: 'Top up' },
        'u1',
      );

      expect(prisma.retainerLedgerEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: RetainerEntryType.deposit,
          amount: 25,
          balanceAfter: 125,
          createdById: 'u1',
        }),
      });
      expect(prisma.clientRetainerAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc1' },
        data: { balance: 125 },
      });
      expect(result.balance).toBe(100);
    });

    it('updates low balance threshold when provided', async () => {
      await service.recordDeposit(
        'c1',
        { amount: 10, lowBalanceThreshold: 50 },
        'u1',
      );

      expect(prisma.clientRetainerAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc1' },
        data: { lowBalanceThreshold: 50 },
      });
    });
  });

  describe('applyToInvoice', () => {
    it('throws when invoice is missing', async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);
      await expect(
        service.applyToInvoice('inv1', { amount: 10 }, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects non-issued invoices', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv1',
        status: InvoiceStatus.draft,
        clientId: 'c1',
        totalAmount: 100,
        paidAmount: 0,
        client: { companyName: 'Acme' },
      });
      await expect(
        service.applyToInvoice('inv1', { amount: 10 }, 'u1'),
      ).rejects.toThrow(/issued invoices/);
    });

    it('rejects when retainer balance is insufficient', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv1',
        status: InvoiceStatus.issued,
        clientId: 'c1',
        invoiceNumber: 'INV-1',
        totalAmount: 100,
        paidAmount: 0,
        paidAt: null,
        client: {
          id: 'c1',
          companyName: 'Acme',
          firstName: null,
          lastName: null,
          internalCode: 'CL-1',
        },
      });
      prisma.clientRetainerAccount.findUnique.mockResolvedValue({
        id: 'acc1',
        balance: 10,
      });

      await expect(
        service.applyToInvoice('inv1', { amount: 50 }, 'u1'),
      ).rejects.toThrow(/Insufficient retainer balance/);
    });

    it('rejects when invoice is already fully paid', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv1',
        status: InvoiceStatus.issued,
        clientId: 'c1',
        invoiceNumber: 'INV-1',
        totalAmount: 100,
        paidAmount: 100,
        paidAt: new Date(),
        client: {
          id: 'c1',
          companyName: 'Acme',
          firstName: null,
          lastName: null,
          internalCode: 'CL-1',
        },
      });

      await expect(
        service.applyToInvoice('inv1', { amount: 10 }, 'u1'),
      ).rejects.toThrow(/already fully paid/);
    });

    it('records partial payment when draw-down is less than total', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv1',
        status: InvoiceStatus.issued,
        clientId: 'c1',
        invoiceNumber: 'INV-1',
        totalAmount: 100,
        paidAmount: 0,
        paidAt: null,
        client: {
          id: 'c1',
          companyName: 'Acme',
          firstName: null,
          lastName: null,
          internalCode: 'CL-1',
        },
      });
      prisma.clientRetainerAccount.findUnique.mockResolvedValue({
        id: 'acc1',
        balance: 200,
      });
      prisma.clientRetainerAccount.findUniqueOrThrow.mockResolvedValue({
        id: 'acc1',
        balance: 200,
      });

      await service.applyToInvoice('inv1', { amount: 50 }, 'u1');

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        data: expect.objectContaining({
          paidAmount: 50,
          paymentStatus: PaymentStatus.partial,
        }),
      });
    });

    it('draws down retainer and records full invoice payment', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv1',
        status: InvoiceStatus.issued,
        clientId: 'c1',
        invoiceNumber: 'INV-1',
        totalAmount: 100,
        paidAmount: 0,
        paidAt: null,
        client: {
          id: 'c1',
          companyName: 'Acme',
          firstName: null,
          lastName: null,
          internalCode: 'CL-1',
        },
      });
      prisma.clientRetainerAccount.findUnique.mockResolvedValue({
        id: 'acc1',
        balance: 200,
      });
      prisma.clientRetainerAccount.findUniqueOrThrow.mockResolvedValue({
        id: 'acc1',
        balance: 200,
      });

      await service.applyToInvoice('inv1', { amount: 100 }, 'u1');

      expect(prisma.retainerLedgerEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: RetainerEntryType.draw_down,
          amount: -100,
          balanceAfter: 100,
          invoiceId: 'inv1',
        }),
      });
      expect(prisma.invoicePayment.create).toHaveBeenCalled();
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        data: expect.objectContaining({
          paidAmount: 100,
          paymentStatus: PaymentStatus.paid,
        }),
      });
    });
  });

  describe('low balance notifications', () => {
    it('notifies staff and portal users when balance drops below threshold', async () => {
      prisma.clientRetainerAccount.findUniqueOrThrow.mockResolvedValue({
        id: 'acc1',
        balance: 100,
      });
      prisma.clientRetainerAccount.findUnique.mockResolvedValue({
        id: 'acc1',
        clientId: 'c1',
        balance: 40,
        currency: 'EUR',
        lowBalanceThreshold: 50,
        client: {
          companyName: 'Acme',
          firstName: null,
          lastName: null,
          internalCode: 'CL-1',
          assignedUserId: 'assigned1',
        },
      });
      prisma.user.findMany
        .mockResolvedValueOnce([{ id: 'finance1', email: 'finance@x.com' }])
        .mockResolvedValueOnce([{ id: 'portal1', email: 'portal@x.com' }]);
      prisma.user.findFirst.mockResolvedValue({
        id: 'assigned1',
        email: 'assigned@x.com',
      });

      await service.recordAdjustment(
        'c1',
        { amount: -60, note: 'Large draw' },
        'u1',
      );

      expect(notifications.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'finance1',
          type: 'retainer_low_balance',
        }),
      );
      expect(notifications.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'portal1',
          type: 'retainer_low_balance',
          metadata: expect.objectContaining({ audience: 'portal_client' }),
        }),
      );
    });

    it('uses depleted notification type when balance reaches zero', async () => {
      prisma.clientRetainerAccount.findUniqueOrThrow.mockResolvedValue({
        id: 'acc1',
        balance: 10,
      });
      prisma.clientRetainerAccount.findUnique.mockResolvedValue({
        id: 'acc1',
        clientId: 'c1',
        balance: 0,
        currency: 'EUR',
        lowBalanceThreshold: 25,
        client: {
          companyName: null,
          firstName: 'Jane',
          lastName: 'Doe',
          internalCode: 'CL-2',
          assignedUserId: null,
        },
      });
      prisma.user.findMany.mockResolvedValue([
        { id: 'finance1', email: 'finance@x.com' },
      ]);

      await service.recordAdjustment(
        'c1',
        { amount: -10, note: 'Final draw' },
        'u1',
      );

      expect(notifications.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'finance1',
          type: 'retainer_depleted',
        }),
      );
    });
  });
});
