import type {
  Deadline,
  FixedFee,
  IpRight,
  Prisma,
  RenewalInstruction,
  RenewalPart,
  RenewalPayment,
  RenewalWindow,
  User,
} from '../../generated/prisma/client';
import { decimalToNumber } from '../billing/billing.utils';

const userBriefSelect = { id: true, fullName: true, email: true } as const;

const renewalPartSelect = {
  id: true,
  renewalWindowId: true,
  jurisdiction: true,
  niceClasses: true,
  status: true,
  officialFee: true,
  serviceFee: true,
  currency: true,
  dueDate: true,
  graceDate: true,
  notes: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const renewalWindowListInclude = {
  ipRight: {
    select: {
      id: true,
      title: true,
      registrationNumber: true,
      jurisdiction: true,
    },
  },
  parts: {
    orderBy: { createdAt: 'asc' as const },
    select: renewalPartSelect,
  },
} satisfies Prisma.RenewalWindowInclude;

export const renewalWindowDetailInclude = {
  ipRight: true,
  parts: {
    orderBy: { createdAt: 'asc' as const },
    select: renewalPartSelect,
  },
  instructions: {
    orderBy: { capturedAt: 'desc' as const },
    include: { capturedBy: { select: userBriefSelect } },
  },
  payments: {
    orderBy: { paidAt: 'desc' as const },
    include: {
      recordedBy: { select: userBriefSelect },
      proofDocumentVersion: {
        select: { id: true, fileName: true, version: true },
      },
    },
  },
  deadlines: {
    orderBy: { dueDate: 'asc' as const },
    include: { assignedTo: { select: userBriefSelect } },
  },
  fixedFees: {
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.RenewalWindowInclude;

export const renewalPortalInstructInclude = {
  ipRight: true,
  matter: { select: { id: true, title: true, assignedToId: true } },
} satisfies Prisma.RenewalWindowInclude;

export type RenewalPortalInstructRow = Prisma.RenewalWindowGetPayload<{
  include: typeof renewalPortalInstructInclude;
}>;

type RenewalWindowListRow = RenewalWindow &
  Prisma.RenewalWindowGetPayload<{ include: typeof renewalWindowListInclude }>;

type RenewalWindowDetailRow = RenewalWindow &
  Prisma.RenewalWindowGetPayload<{
    include: typeof renewalWindowDetailInclude;
  }>;

function serializeUser(user: Pick<User, 'id' | 'fullName' | 'email'>) {
  return user;
}

export const renewalWorklistInclude = {
  ipRight: {
    select: {
      id: true,
      title: true,
      registrationNumber: true,
      rightType: true,
      jurisdiction: true,
    },
  },
  matter: {
    select: {
      id: true,
      title: true,
      matterType: true,
      assignedTo: { select: userBriefSelect },
      client: {
        select: {
          id: true,
          type: true,
          internalCode: true,
          companyName: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  parts: {
    orderBy: { createdAt: 'asc' as const },
    select: renewalPartSelect,
  },
} satisfies Prisma.RenewalWindowInclude;

type RenewalWorklistRow = RenewalWindow &
  Prisma.RenewalWindowGetPayload<{ include: typeof renewalWorklistInclude }>;

export function serializeRenewalPart(
  row: Pick<
    RenewalPart,
    | 'id'
    | 'renewalWindowId'
    | 'jurisdiction'
    | 'niceClasses'
    | 'status'
    | 'officialFee'
    | 'serviceFee'
    | 'currency'
    | 'dueDate'
    | 'graceDate'
    | 'notes'
    | 'completedAt'
    | 'createdAt'
    | 'updatedAt'
  >,
) {
  return {
    id: row.id,
    renewalWindowId: row.renewalWindowId,
    jurisdiction: row.jurisdiction,
    niceClasses: row.niceClasses,
    status: row.status,
    officialFee:
      row.officialFee == null ? null : decimalToNumber(row.officialFee),
    serviceFee: row.serviceFee == null ? null : decimalToNumber(row.serviceFee),
    currency: row.currency,
    dueDate: row.dueDate,
    graceDate: row.graceDate,
    notes: row.notes,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function serializeRenewalWorklistItem(row: RenewalWorklistRow) {
  return {
    ...serializeRenewalWindowList(row),
    matter: row.matter,
  };
}

export function serializeRenewalWindowList(row: RenewalWindowListRow) {
  return {
    id: row.id,
    ipRightId: row.ipRightId,
    matterId: row.matterId,
    clientId: row.clientId,
    cycleNumber: row.cycleNumber,
    jurisdiction: row.jurisdiction,
    dueDate: row.dueDate,
    graceDate: row.graceDate,
    status: row.status,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ipRight: row.ipRight,
    parts: (row.parts ?? []).map(serializeRenewalPart),
  };
}

export function serializeRenewalWindowDetail(row: RenewalWindowDetailRow) {
  return {
    ...serializeRenewalWindowList(row),
    instructions: row.instructions.map(serializeInstruction),
    payments: row.payments.map(serializePayment),
    deadlines: row.deadlines.map(serializeDeadline),
    fixedFees: row.fixedFees.map(serializeFixedFee),
    ipRight: row.ipRight,
  };
}

function serializeInstruction(
  row: RenewalInstruction & {
    capturedBy: Pick<User, 'id' | 'fullName' | 'email'>;
  },
) {
  return {
    id: row.id,
    renewalPartId: row.renewalPartId,
    decision: row.decision,
    notes: row.notes,
    capturedAt: row.capturedAt,
    capturedBy: serializeUser(row.capturedBy),
  };
}

function serializePayment(
  row: RenewalPayment & {
    recordedBy: Pick<User, 'id' | 'fullName' | 'email'>;
    proofDocumentVersion: {
      id: string;
      fileName: string;
      version: number;
    } | null;
  },
) {
  return {
    id: row.id,
    renewalPartId: row.renewalPartId,
    amount: decimalToNumber(row.amount),
    currency: row.currency,
    paidAt: row.paidAt,
    proofDocumentVersion: row.proofDocumentVersion,
    recordedBy: serializeUser(row.recordedBy),
    createdAt: row.createdAt,
  };
}

function serializeDeadline(
  row: Deadline & { assignedTo: Pick<User, 'id' | 'fullName' | 'email'> },
) {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.dueDate,
    graceDate: row.graceDate,
    status: row.status,
    assignedTo: serializeUser(row.assignedTo),
  };
}

function serializeFixedFee(row: FixedFee) {
  return {
    id: row.id,
    description: row.description,
    amount: decimalToNumber(row.amount),
    currency: row.currency,
    category: row.category,
    date: row.date,
    invoiceId: row.invoiceId,
  };
}

export function serializeIpRightWithRenewals(
  row: IpRight & { renewalWindows: RenewalWindow[] },
) {
  return {
    ...row,
    renewalWindows: row.renewalWindows.map((w) => ({
      id: w.id,
      cycleNumber: w.cycleNumber,
      dueDate: w.dueDate,
      graceDate: w.graceDate,
      status: w.status,
      jurisdiction: w.jurisdiction,
      completedAt: w.completedAt,
    })),
  };
}
