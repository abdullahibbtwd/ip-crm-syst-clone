import { Injectable } from '@nestjs/common';
import {
  DeadlineStatus,
  MatterStatus,
  TaskStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';

const ACTIVE_MATTER_STATUSES: MatterStatus[] = [
  MatterStatus.active,
  MatterStatus.on_hold,
];

const ACTIVE_DEADLINE_STATUSES: DeadlineStatus[] = [
  DeadlineStatus.pending,
  DeadlineStatus.in_progress,
  DeadlineStatus.escalated,
];

@Injectable()
export class ReportsTeamWorkloadService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeamWorkload() {
    const now = new Date();

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          none: { role: { name: SYSTEM_ROLES.PORTAL_CLIENT } },
        },
      },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        userRoles: {
          select: { role: { select: { name: true } } },
        },
      },
    });

    const userIds = users.map((u) => u.id);

    const [matterGroups, taskGroups, deadlineGroups] = await Promise.all([
      this.prisma.matter.groupBy({
        by: ['assignedToId'],
        where: {
          assignedToId: { in: userIds },
          status: { in: ACTIVE_MATTER_STATUSES },
        },
        _count: { _all: true },
      }),
      this.prisma.task.groupBy({
        by: ['assignedToId'],
        where: {
          assignedToId: { in: userIds },
          status: TaskStatus.pending,
        },
        _count: { _all: true },
      }),
      this.prisma.deadline.groupBy({
        by: ['assignedToId'],
        where: {
          assignedToId: { in: userIds },
          status: { in: ACTIVE_DEADLINE_STATUSES },
        },
        _count: { _all: true },
      }),
    ]);

    const matterByUser = new Map(
      matterGroups
        .filter((g) => g.assignedToId)
        .map((g) => [g.assignedToId!, g._count._all]),
    );
    const taskByUser = new Map(
      taskGroups.map((g) => [g.assignedToId, g._count._all]),
    );
    const deadlineByUser = new Map(
      deadlineGroups.map((g) => [g.assignedToId, g._count._all]),
    );

    const members = users.map((user) => {
      const matters = matterByUser.get(user.id) ?? 0;
      const tasks = taskByUser.get(user.id) ?? 0;
      const deadlines = deadlineByUser.get(user.id) ?? 0;
      const roles = user.userRoles.map((ur) => ur.role.name);

      return {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          roles,
        },
        counts: {
          matters,
          tasks,
          deadlines,
          total: matters + tasks + deadlines,
        },
      };
    });

    members.sort(
      (a, b) =>
        b.counts.total - a.counts.total ||
        a.user.fullName.localeCompare(b.user.fullName),
    );

    const summary = members.reduce(
      (acc, m) => ({
        teamMembers: acc.teamMembers + 1,
        totalMatters: acc.totalMatters + m.counts.matters,
        totalTasks: acc.totalTasks + m.counts.tasks,
        totalDeadlines: acc.totalDeadlines + m.counts.deadlines,
        totalWorkload: acc.totalWorkload + m.counts.total,
      }),
      {
        teamMembers: 0,
        totalMatters: 0,
        totalTasks: 0,
        totalDeadlines: 0,
        totalWorkload: 0,
      },
    );

    return {
      generatedAt: now.toISOString(),
      summary,
      members,
    };
  }
}
