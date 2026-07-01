import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email.service';
import {
  NOTIFICATION_EMAIL_QUEUE,
  SEND_EMAIL_JOB,
  type SendEmailJobData,
} from '../notifications.constants';

@Processor(NOTIFICATION_EMAIL_QUEUE)
export class NotificationEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationEmailProcessor.name);

  constructor(
    private readonly email: EmailService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<SendEmailJobData>) {
    if (job.name !== SEND_EMAIL_JOB) return;

    await this.email.send({
      to: job.data.to,
      subject: job.data.subject,
      text: job.data.text,
      html: job.data.html,
    });

    if (job.data.notificationId) {
      await this.prisma.notification.update({
        where: { id: job.data.notificationId },
        data: { emailSentAt: new Date() },
      });
    }

    this.logger.log(`Email sent to ${job.data.to}: ${job.data.subject}`);
  }
}
