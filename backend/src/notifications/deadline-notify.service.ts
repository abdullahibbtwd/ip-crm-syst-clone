import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationDispatchService } from './notification-dispatch.service';

const deadlineNotifyInclude = {
  assignedTo: { select: { id: true, email: true, fullName: true } },
  matter: { select: { id: true, title: true } },
} as const;

function formatDueDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

@Injectable()
export class DeadlineNotifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  async notifyAssigned(deadlineId: string) {
    const deadline = await this.prisma.deadline.findUnique({
      where: { id: deadlineId },
      include: deadlineNotifyInclude,
    });
    if (!deadline) return;

    const dueLabel = formatDueDate(deadline.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(deadline.dueDate);
    dueDay.setHours(0, 0, 0, 0);
    const isOverdue = dueDay < today;

    await this.dispatch.dispatchDeadline({
      userId: deadline.assignedToId,
      assigneeName: deadline.assignedTo.fullName,
      type: 'deadline_reminder',
      title: isOverdue
        ? `Overdue deadline assigned: ${deadline.title}`
        : `New deadline: ${deadline.title}`,
      body: isOverdue
        ? `${deadline.matter.title} was due ${dueLabel} and is now on your worklist.`
        : `${deadline.matter.title} - due ${dueLabel}.`,
      resource: 'deadline',
      resourceId: deadline.id,
      linkUrl: `/matters/${deadline.matterId}/deadlines`,
      emailTo: deadline.assignedTo.email,
      emailSubject: isOverdue
        ? `Overdue: ${deadline.title} (${dueLabel})`
        : `New deadline: ${deadline.title} (${dueLabel})`,
      metadata: {
        matterId: deadline.matterId,
        dueDate: deadline.dueDate.toISOString(),
        source: 'deadline_created',
      },
    });
  }
}
