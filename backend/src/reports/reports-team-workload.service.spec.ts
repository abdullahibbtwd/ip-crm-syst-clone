import { PrismaService } from '../prisma/prisma.service';
import { ReportsTeamWorkloadService } from './reports-team-workload.service';

describe('ReportsTeamWorkloadService', () => {
  let service: ReportsTeamWorkloadService;
  let prisma: {
    user: { findMany: jest.Mock };
    matter: { groupBy: jest.Mock };
    task: { groupBy: jest.Mock };
    deadline: { groupBy: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      user: { findMany: jest.fn() },
      matter: { groupBy: jest.fn() },
      task: { groupBy: jest.fn() },
      deadline: { groupBy: jest.fn() },
    };
    service = new ReportsTeamWorkloadService(
      prisma as unknown as PrismaService,
    );
  });

  it('returns empty workload when no active team members', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.matter.groupBy.mockResolvedValue([]);
    prisma.task.groupBy.mockResolvedValue([]);
    prisma.deadline.groupBy.mockResolvedValue([]);

    const result = await service.getTeamWorkload();

    expect(result.summary.teamMembers).toBe(0);
    expect(result.members).toEqual([]);
  });

  it('aggregates matters, tasks, and deadlines per team member', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'u1',
        fullName: 'Bob Builder',
        email: 'bob@firm.com',
        userRoles: [{ role: { name: 'attorney' } }],
      },
      {
        id: 'u2',
        fullName: 'Ada Lovelace',
        email: 'ada@firm.com',
        userRoles: [{ role: { name: 'paralegal' } }],
      },
    ]);
    prisma.matter.groupBy.mockResolvedValue([
      { assignedToId: 'u1', _count: { _all: 2 } },
      { assignedToId: 'u2', _count: { _all: 1 } },
    ]);
    prisma.task.groupBy.mockResolvedValue([
      { assignedToId: 'u1', _count: { _all: 3 } },
    ]);
    prisma.deadline.groupBy.mockResolvedValue([
      { assignedToId: 'u1', _count: { _all: 1 } },
      { assignedToId: 'u2', _count: { _all: 4 } },
    ]);

    const result = await service.getTeamWorkload();

    expect(result.summary).toMatchObject({
      teamMembers: 2,
      totalMatters: 3,
      totalTasks: 3,
      totalDeadlines: 5,
      totalWorkload: 11,
    });
    expect(result.members[0].user.fullName).toBe('Bob Builder');
    expect(result.members[0].counts).toEqual({
      matters: 2,
      tasks: 3,
      deadlines: 1,
      total: 6,
    });
    expect(result.members[1].counts.total).toBe(5);
  });
});
