import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentStatus,
  RetainerEntryType,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { roundMoney } from '../billing/billing.utils';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import type {
  ApplyRetainerDto,
  CreateRetainerAdjustmentDto,
  CreateRetainerDepositDto,
} from './dto/retainer.dto';

const userSelect = { id: true, fullName: true, email: true } as const;

function decimalToNumber(value: { toString(): string } | number) {
  return roundMoney(Number(value));
}

function clientDisplayName(client: {
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  internalCode: string | null;
}) {
  return (
    client.companyName ||
    [client.firstName, client.lastName].filter(Boolean).join(' ') ||
    client.internalCode ||
    'Client'
  );
}

@Injectable()
export class RetainersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationDispatchService,
  ) {}

  async getByClientId(clientId: string) {
    await this.assertClientExists(clientId);
    const account = await this.ensureAccount(clientId);

    const entries = await this.prisma.retainerLedgerEntry.findMany({
      where: { accountId: account.id },
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
      include: {
        createdBy: { select: userSelect },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    });

    return {
      clientId,
      currency: account.currency,
      balance: decimalToNumber(account.balance),
      lowBalanceThreshold:
        account.lowBalanceThreshold != null
          ? decimalToNumber(account.lowBalanceThreshold)
          : null,
      entries: entries.map((entry) => ({
        id: entry.id,
        type: entry.type,
        amount: decimalToNumber(entry.amount),
        balanceAfter: decimalToNumber(entry.balanceAfter),
        invoiceId: entry.invoiceId,
        invoiceNumber: entry.invoice?.invoiceNumber ?? null,
        note: entry.note,
        createdBy: entry.createdBy,
        createdAt: entry.createdAt,
      })),
    };
  }

  async getPortalBalance(clientId: string) {
    const account = await this.prisma.clientRetainerAccount.findUnique({
      where: { clientId },
    });

    if (!account) {
      return { clientId, currency: 'EUR', balance: 0, entries: [] };
    }

    const entries = await this.prisma.retainerLedgerEntry.findMany({
      where: { accountId: account.id },
      orderBy: [{ createdAt: 'desc' }],
      take: 20,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        createdAt: true,
        invoice: { select: { invoiceNumber: true } },
      },
    });

    return {
      clientId,
      currency: account.currency,
      balance: decimalToNumber(account.balance),
      entries: entries.map((entry) => ({
        id: entry.id,
        type: entry.type,
        amount: decimalToNumber(entry.amount),
        balanceAfter: decimalToNumber(entry.balanceAfter),
        invoiceNumber: entry.invoice?.invoiceNumber ?? null,
        createdAt: entry.createdAt,
      })),
    };
  }

  async recordDeposit(
    clientId: string,
    dto: CreateRetainerDepositDto,
    userId: string,
  ) {
    await this.assertClientExists(clientId);

    const amount = roundMoney(dto.amount);
    const account = await this.ensureAccount(clientId);

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.clientRetainerAccount.findUniqueOrThrow({
        where: { id: account.id },
      });
      const nextBalance = roundMoney(decimalToNumber(current.balance) + amount);

      if (dto.lowBalanceThreshold != null) {
        await tx.clientRetainerAccount.update({
          where: { id: account.id },
          data: { lowBalanceThreshold: dto.lowBalanceThreshold },
        });
      }

      await tx.retainerLedgerEntry.create({
        data: {
          accountId: account.id,
          type: RetainerEntryType.deposit,
          amount,
          balanceAfter: nextBalance,
          note: dto.note?.trim() || null,
          createdById: userId,
        },
      });

      await tx.clientRetainerAccount.update({
        where: { id: account.id },
        data: { balance: nextBalance },
      });
    });

    return this.getByClientId(clientId);
  }

  async recordAdjustment(
    clientId: string,
    dto: CreateRetainerAdjustmentDto,
    userId: string,
  ) {
    await this.assertClientExists(clientId);
    const amount = roundMoney(dto.amount);
    if (amount === 0) {
      throw new BadRequestException('Adjustment amount cannot be zero');
    }

    const account = await this.ensureAccount(clientId);

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.clientRetainerAccount.findUniqueOrThrow({
        where: { id: account.id },
      });
      const nextBalance = roundMoney(
        decimalToNumber(current.balance) + amount,
      );

      if (nextBalance < 0) {
        throw new BadRequestException('Adjustment would make balance negative');
      }

      await tx.retainerLedgerEntry.create({
        data: {
          accountId: account.id,
          type: RetainerEntryType.adjustment,
          amount,
          balanceAfter: nextBalance,
          note: dto.note.trim(),
          createdById: userId,
        },
      });

      await tx.clientRetainerAccount.update({
        where: { id: account.id },
        data: { balance: nextBalance },
      });
    });

    await this.maybeNotifyLowBalance(clientId);
    return this.getByClientId(clientId);
  }

  async applyToInvoice(
    invoiceId: string,
    dto: ApplyRetainerDto,
    userId: string,
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true,
            internalCode: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status !== InvoiceStatus.issued) {
      throw new BadRequestException(
        'Retainer can only be applied to issued invoices',
      );
    }

    const totalAmount = decimalToNumber(invoice.totalAmount);
    const currentPaid = decimalToNumber(invoice.paidAmount);
    const remaining = roundMoney(totalAmount - currentPaid);
    const amount = roundMoney(Math.min(dto.amount, remaining));

    if (amount <= 0) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    const account = await this.prisma.clientRetainerAccount.findUnique({
      where: { clientId: invoice.clientId },
    });

    if (!account || decimalToNumber(account.balance) < amount) {
      throw new BadRequestException('Insufficient retainer balance');
    }

    const paymentStatus =
      roundMoney(currentPaid + amount) >= totalAmount
        ? PaymentStatus.paid
        : PaymentStatus.partial;

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.clientRetainerAccount.findUniqueOrThrow({
        where: { id: account.id },
      });
      const nextBalance = roundMoney(decimalToNumber(current.balance) - amount);

      await tx.retainerLedgerEntry.create({
        data: {
          accountId: account.id,
          type: RetainerEntryType.draw_down,
          amount: -amount,
          balanceAfter: nextBalance,
          invoiceId: invoice.id,
          note: `Applied to invoice ${invoice.invoiceNumber ?? invoice.id}`,
          createdById: userId,
        },
      });

      await tx.clientRetainerAccount.update({
        where: { id: account.id },
        data: { balance: nextBalance },
      });

      await tx.invoicePayment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          paidAt: new Date(),
          method: 'retainer',
          reference: 'Retainer draw-down',
          recordedById: userId,
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: roundMoney(currentPaid + amount),
          paymentStatus,
          paidAt: paymentStatus === PaymentStatus.paid ? new Date() : invoice.paidAt,
        },
      });
    });

    await this.maybeNotifyLowBalance(invoice.clientId);
    return this.getByClientId(invoice.clientId);
  }

  private async ensureAccount(clientId: string) {
    return this.prisma.clientRetainerAccount.upsert({
      where: { clientId },
      create: { clientId },
      update: {},
    });
  }

  private async assertClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
  }

  private async maybeNotifyLowBalance(clientId: string) {
    const account = await this.prisma.clientRetainerAccount.findUnique({
      where: { clientId },
      include: {
        client: {
          select: {
            companyName: true,
            firstName: true,
            lastName: true,
            internalCode: true,
            assignedUserId: true,
          },
        },
      },
    });

    if (!account) return;

    const balance = decimalToNumber(account.balance);
    const threshold =
      account.lowBalanceThreshold != null
        ? decimalToNumber(account.lowBalanceThreshold)
        : null;

    if (threshold == null || balance > threshold) return;

    const clientName = clientDisplayName(account.client);
    const type =
      balance <= 0 ? 'retainer_depleted' : ('retainer_low_balance' as const);
    const isDepleted = balance <= 0;

    const staffTitle = isDepleted
      ? `Retainer depleted: ${clientName}`
      : `Retainer running low: ${clientName}`;
    const staffBody = isDepleted
      ? `${clientName} has no remaining retainer balance. Request a top-up before continuing billable work.`
      : `${clientName} retainer balance is ${balance.toFixed(2)} ${account.currency}, below the ${threshold.toFixed(2)} threshold.`;

    const portalTitle = isDepleted
      ? 'Your retainer balance is depleted'
      : 'Your retainer balance is running low';
    const portalBody = isDepleted
      ? `Your prepaid retainer has reached ${balance.toFixed(2)} ${account.currency}. Please arrange a top-up with your attorney so work can continue uninterrupted.`
      : `Your retainer balance is ${balance.toFixed(2)} ${account.currency}, below the alert threshold of ${threshold.toFixed(2)} ${account.currency}. Please contact your attorney to arrange a top-up.`;

    const staffRecipients = await this.listFinanceAlertRecipients(
      account.client.assignedUserId,
    );

    for (const recipient of staffRecipients) {
      await this.notifications.dispatch({
        userId: recipient.id,
        type,
        title: staffTitle,
        body: staffBody,
        resource: 'retainer',
        resourceId: account.id,
        linkUrl: `/clients/${clientId}/billing`,
        emailTo: recipient.email,
        emailSubject: staffTitle,
        metadata: {
          clientId,
          balance,
          threshold,
          audience: 'staff',
        },
      });
    }

    const portalUsers = await this.prisma.user.findMany({
      where: {
        clientId,
        isActive: true,
        userRoles: {
          some: { role: { name: SYSTEM_ROLES.PORTAL_CLIENT } },
        },
      },
      select: { id: true, email: true },
    });

    for (const user of portalUsers) {
      await this.notifications.dispatch({
        userId: user.id,
        type,
        title: portalTitle,
        body: portalBody,
        resource: 'retainer',
        resourceId: account.id,
        linkUrl: '/portal/invoices',
        emailTo: user.email,
        emailSubject: portalTitle,
        metadata: {
          clientId,
          balance,
          threshold,
          audience: 'portal_client',
        },
      });
    }
  }

  private async listFinanceAlertRecipients(assignedUserId: string | null) {
    const financeUsers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          some: {
            role: {
              name: {
                in: [SYSTEM_ROLES.FINANCE, SYSTEM_ROLES.MANAGING_PARTNER],
              },
            },
          },
        },
      },
      select: { id: true, email: true },
    });

    const byId = new Map(financeUsers.map((user) => [user.id, user]));

    if (assignedUserId) {
      const assigned = await this.prisma.user.findFirst({
        where: { id: assignedUserId, isActive: true },
        select: { id: true, email: true },
      });
      if (assigned) {
        byId.set(assigned.id, assigned);
      }
    }

    return [...byId.values()];
  }
}
