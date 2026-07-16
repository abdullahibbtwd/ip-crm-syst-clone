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
});
