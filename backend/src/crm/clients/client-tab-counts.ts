import { DeadlineStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type ClientTabCounts = {
  offices: number;
  contacts: number;
  related: number;
  history: number;
  matters: number;
  documents: number;
  correspondence: number;
  watch: number;
  billing: number;
  access: number;
  notes: number;
  deadlines: number;
};

export const EMPTY_CLIENT_TAB_COUNTS: ClientTabCounts = {
  offices: 0,
  contacts: 0,
  related: 0,
  history: 0,
  matters: 0,
  documents: 0,
  correspondence: 0,
  watch: 0,
  billing: 0,
  access: 0,
  notes: 0,
  deadlines: 0,
};

const OPEN_DEADLINE_STATUSES: DeadlineStatus[] = [
  DeadlineStatus.pending,
  DeadlineStatus.in_progress,
  DeadlineStatus.escalated,
];

export async function loadClientTabCounts(
  prisma: PrismaService,
  clientIds: string[],
): Promise<Map<string, ClientTabCounts>> {
  const counts = new Map<string, ClientTabCounts>();
  for (const id of clientIds) {
    counts.set(id, { ...EMPTY_CLIENT_TAB_COUNTS });
  }
  if (clientIds.length === 0) return counts;

  const [clients, matters, accessRows] = await Promise.all([
    prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: {
        id: true,
        _count: {
          select: {
            offices: true,
            contacts: { where: { isActive: true } },
            relatedCompanies: true,
            relationshipHistory: true,
            matters: { where: { isArchived: false } },
            documents: true,
            correspondence: true,
            watchProfiles: true,
            invoices: true,
            clientNotes: true,
          },
        },
      },
    }),
    prisma.matter.findMany({
      where: { clientId: { in: clientIds }, isArchived: false },
      select: {
        clientId: true,
        _count: {
          select: {
            documents: true,
            correspondence: true,
            deadlines: { where: { status: { in: OPEN_DEADLINE_STATUSES } } },
          },
        },
      },
    }),
    prisma.auditLog.groupBy({
      by: ['resourceId'],
      where: { resource: 'client', resourceId: { in: clientIds } },
      _count: { _all: true },
    }),
  ]);

  for (const client of clients) {
    const current = counts.get(client.id);
    if (!current) continue;
    const tally = client._count;
    if (!tally) continue;
    current.offices = tally.offices;
    current.contacts = tally.contacts;
    current.related = tally.relatedCompanies;
    current.history = tally.relationshipHistory;
    current.matters = tally.matters;
    current.documents = tally.documents;
    current.correspondence = tally.correspondence;
    current.watch = tally.watchProfiles;
    current.billing = tally.invoices;
    current.notes = tally.clientNotes;
  }

  for (const matter of matters) {
    const current = counts.get(matter.clientId);
    if (!current) continue;
    current.documents += matter._count.documents;
    current.correspondence += matter._count.correspondence;
    current.deadlines += matter._count.deadlines;
  }

  for (const row of accessRows) {
    if (!row.resourceId) continue;
    const current = counts.get(row.resourceId);
    if (!current) continue;
    current.access = row._count._all;
  }

  return counts;
}
