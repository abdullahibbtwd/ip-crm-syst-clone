import { DeadlineStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: { deadline: { findMany: jest.Mock } };

  beforeEach(() => {
    prisma = { deadline: { findMany: jest.fn() } };
    service = new ReportsService(prisma as unknown as PrismaService);
  });

  it('returns empty summary when no deadlines', async () => {
    prisma.deadline.findMany.mockResolvedValue([]);
    const result = await service.getDeadlineRisk({});
    expect(result.summary.total).toBe(0);
    expect(result.groups).toEqual([]);
  });

  it('aggregates urgency by client / jurisdiction / assignee', async () => {
    const due = new Date();
    due.setDate(due.getDate() + 2);
    prisma.deadline.findMany.mockResolvedValue([
      {
        id: 'd1',
        title: 'Reply',
        dueDate: due,
        status: DeadlineStatus.pending,
        escalationLevel: 0,
        jurisdiction: 'EU',
        assignedTo: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
        rule: null,
        matter: {
          id: 'm1',
          title: 'Matter',
          client: {
            id: 'c1',
            internalCode: 'CL-1',
            companyName: 'Acme',
            firstName: null,
            lastName: null,
            type: 'company',
          },
        },
      },
    ]);

    const result = await service.getDeadlineRisk({ dueWithinDays: 30 });
    expect(result.summary.total).toBe(1);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].client.companyName).toBe('Acme');
  });

  describe('extended branch coverage', () => {
    it('filters out deadlines outside risk window unless missed/escalated', async () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 120);
      prisma.deadline.findMany.mockResolvedValue([
        {
          id: 'd-far',
          title: 'Far',
          dueDate: farFuture,
          status: DeadlineStatus.pending,
          escalationLevel: 0,
          jurisdiction: 'EU',
          assignedTo: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
          rule: null,
          matter: {
            id: 'm1',
            title: 'Matter',
            client: {
              id: 'c1',
              internalCode: 'CL-1',
              companyName: 'Acme',
              firstName: null,
              lastName: null,
              type: 'company',
            },
          },
        },
        {
          id: 'd-missed',
          title: 'Missed',
          dueDate: farFuture,
          status: DeadlineStatus.missed,
          escalationLevel: 1,
          jurisdiction: null,
          assignedTo: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
          rule: { jurisdiction: 'DE' },
          matter: {
            id: 'm2',
            title: 'Other',
            client: {
              id: 'c1',
              internalCode: 'CL-1',
              companyName: 'Acme',
              firstName: null,
              lastName: null,
              type: 'company',
            },
          },
        },
      ]);

      const result = await service.getDeadlineRisk({ dueWithinDays: 30 });
      expect(result.summary.total).toBe(1);
      expect(result.groups[0].jurisdictions[0].jurisdiction).toBe('DE');
    });

    it('applies assignedToId, jurisdiction, and clientId filters', async () => {
      prisma.deadline.findMany.mockResolvedValue([]);
      await service.getDeadlineRisk({
        assignedToId: 'u9',
        jurisdiction: 'eu',
        clientId: 'c9',
        dueWithinDays: 14,
      });
      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToId: 'u9',
            OR: [{ jurisdiction: 'EU' }, { rule: { jurisdiction: 'EU' } }],
            matter: { clientId: 'c9' },
          }),
        }),
      );
    });

    it('sorts individual clients by name and counts urgency tiers', async () => {
      const overdue = new Date();
      overdue.setDate(overdue.getDate() - 2);
      const today = new Date();
      prisma.deadline.findMany.mockResolvedValue([
        {
          id: 'd1',
          title: 'Overdue',
          dueDate: overdue,
          status: DeadlineStatus.pending,
          escalationLevel: 0,
          jurisdiction: 'EU',
          assignedTo: { id: 'u1', fullName: 'Zoe', email: 'z@x.com' },
          rule: null,
          matter: {
            id: 'm1',
            title: 'M1',
            client: {
              id: 'c-ind',
              internalCode: 'CL-I',
              companyName: null,
              firstName: 'Bob',
              lastName: 'Individual',
              type: 'individual',
            },
          },
        },
        {
          id: 'd2',
          title: 'Today',
          dueDate: today,
          status: DeadlineStatus.in_progress,
          escalationLevel: 0,
          jurisdiction: 'EU',
          assignedTo: { id: 'u2', fullName: 'Ada', email: 'a@x.com' },
          rule: null,
          matter: {
            id: 'm2',
            title: 'M2',
            client: {
              id: 'c-ind',
              internalCode: 'CL-I',
              companyName: null,
              firstName: 'Bob',
              lastName: 'Individual',
              type: 'individual',
            },
          },
        },
      ]);

      const result = await service.getDeadlineRisk({});
      expect(result.summary.overdue).toBeGreaterThanOrEqual(1);
      expect(result.summary.today).toBeGreaterThanOrEqual(1);
      expect(result.summary.critical).toBeGreaterThanOrEqual(1);
      expect(result.groups[0].client.firstName).toBe('Bob');
    });

    it('skips rows without matter client data', async () => {
      const due = new Date();
      due.setDate(due.getDate() + 1);
      prisma.deadline.findMany.mockResolvedValue([
        {
          id: 'd-orphan',
          title: 'Orphan',
          dueDate: due,
          status: DeadlineStatus.pending,
          escalationLevel: 0,
          jurisdiction: 'EU',
          assignedTo: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
          rule: null,
          matter: null,
        },
      ]);
      const result = await service.getDeadlineRisk({});
      expect(result.summary.total).toBe(0);
      expect(result.groups).toEqual([]);
    });
  });
});
