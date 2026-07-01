import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MatterTimelineEventType,
  Prisma,
  TaskStatus,
} from '../../generated/prisma/client';
import { parseLimit } from '../crm/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { ACTIVE_TASK_STATUSES } from './tasks.constants';
import { CreateTaskDto, MyTasksQueryDto, UpdateTaskDto } from './dto/task.dto';

const userSelect = { id: true, fullName: true, email: true } as const;

const taskInclude = {
  assignedTo: { select: userSelect },
  createdBy: { select: userSelect },
  completedBy: { select: userSelect },
} satisfies Prisma.TaskInclude;

const myTaskInclude = {
  ...taskInclude,
  matter: {
    select: {
      id: true,
      title: true,
      matterType: true,
      client: {
        select: {
          id: true,
          internalCode: true,
          companyName: true,
          firstName: true,
          lastName: true,
          type: true,
        },
      },
    },
  },
} satisfies Prisma.TaskInclude;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationDispatchService,
  ) {}

  async listForMatter(matterId: string) {
    await this.assertMatterExists(matterId);
    return this.prisma.task.findMany({
      where: { matterId },
      orderBy: [
        { status: 'desc' },
        { priority: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
      include: taskInclude,
    });
  }

  async listMyTasks(userId: string, query: MyTasksQueryDto) {
    const take = parseLimit(query.limit, 50);

    const where: Prisma.TaskWhereInput = {
      assignedToId: userId,
      status: query.status ?? { in: [...ACTIVE_TASK_STATUSES] },
    };

    const rows = await this.prisma.task.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { dueDate: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
      ],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: myTaskInclude,
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  }

  async create(matterId: string, dto: CreateTaskDto, userId: string) {
    await this.assertMatterExists(matterId);
    await this.assertActiveUser(dto.assignedToId);

    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          matterId,
          title: dto.title.trim(),
          notes: dto.notes?.trim() || null,
          assignedToId: dto.assignedToId,
          createdById: userId,
          dueDate,
          priority: dto.priority ?? 'normal',
        },
        include: taskInclude,
      });

      await tx.matterTimelineEvent.create({
        data: {
          matterId,
          eventType: MatterTimelineEventType.task,
          title: `Added: ${created.title}`,
          description: `Assigned to ${created.assignedTo.fullName}`,
          occurredAt: new Date(),
          sourceTaskId: created.id,
          createdById: userId,
          metadata: {
            taskId: created.id,
            action: 'added',
            assignedToId: created.assignedToId,
          } as Prisma.InputJsonValue,
        },
      });

      return created;
    });

    if (task.assignedToId !== userId) {
      await this.notifications.dispatch({
        userId: task.assignedToId,
        type: 'task_assigned',
        title: `New task: ${task.title}`,
        body: task.createdBy
          ? `Assigned by ${task.createdBy.fullName}`
          : 'You have a new task on a matter.',
        resource: 'task',
        resourceId: task.id,
        linkUrl: `/matters/${matterId}/tasks`,
        emailTo: task.assignedTo.email,
        emailSubject: `New task assigned: ${task.title}`,
        metadata: { matterId, taskId: task.id },
      });
    }

    return task;
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    userId: string,
    userRoles: string[],
  ) {
    const existing = await this.prisma.task.findUnique({
      where: { id },
      include: taskInclude,
    });
    if (!existing) throw new NotFoundException('Task not found');

    const isMp = userRoles.includes(SYSTEM_ROLES.MANAGING_PARTNER);
    const isAssignee = existing.assignedToId === userId;
    const isCreator = existing.createdById === userId;

    if (existing.status === TaskStatus.completed) {
      if (!isMp) {
        throw new ForbiddenException('Completed tasks cannot be edited');
      }
      if (this.hasNonReassignFields(dto)) {
        throw new BadRequestException(
          'Only reassignment is allowed on completed tasks',
        );
      }
      if (!dto.assignedToId) {
        throw new BadRequestException('Provide assignedToId to reassign');
      }
      await this.assertActiveUser(dto.assignedToId);
      return this.prisma.task.update({
        where: { id },
        data: { assignedToId: dto.assignedToId },
        include: taskInclude,
      });
    }

    if (!isMp && !isAssignee && !isCreator) {
      throw new ForbiddenException('You cannot edit this task');
    }

    if (dto.status === TaskStatus.completed) {
      if (!isMp && !isAssignee) {
        throw new ForbiddenException('Only the assignee can complete this task');
      }
      return this.completeTask(existing, userId);
    }

    if (dto.status && dto.status !== TaskStatus.pending) {
      throw new BadRequestException('Invalid status transition');
    }

    if (dto.assignedToId) {
      await this.assertActiveUser(dto.assignedToId);
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        notes: dto.notes === null ? null : dto.notes?.trim(),
        assignedToId: dto.assignedToId,
        dueDate:
          dto.dueDate === null
            ? null
            : dto.dueDate
              ? new Date(dto.dueDate)
              : undefined,
        priority: dto.priority,
      },
      include: taskInclude,
    });
  }

  async delete(id: string) {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');
    await this.prisma.task.delete({ where: { id } });
    return { deleted: true };
  }

  private async completeTask(
    existing: Prisma.TaskGetPayload<{ include: typeof taskInclude }>,
    userId: string,
  ) {
    const completedAt = new Date();
    const completedBy = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: existing.id },
        data: {
          status: TaskStatus.completed,
          completedAt,
          completedById: userId,
        },
        include: taskInclude,
      });

      await tx.matterTimelineEvent.create({
        data: {
          matterId: existing.matterId,
          eventType: MatterTimelineEventType.task,
          title: `Completed: ${existing.title}`,
          description: completedBy
            ? `Completed by ${completedBy.fullName}`
            : undefined,
          occurredAt: completedAt,
          sourceTaskId: existing.id,
          createdById: userId,
          metadata: {
            taskId: existing.id,
            action: 'completed',
            completedById: userId,
          } as Prisma.InputJsonValue,
        },
      });

      return task;
    });
  }

  private hasNonReassignFields(dto: UpdateTaskDto): boolean {
    return (
      dto.title != null ||
      dto.notes != null ||
      dto.dueDate != null ||
      dto.priority != null ||
      dto.status != null
    );
  }

  private async assertMatterExists(matterId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { id: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');
  }

  private async assertActiveUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Assignee not found or inactive');
  }
}
