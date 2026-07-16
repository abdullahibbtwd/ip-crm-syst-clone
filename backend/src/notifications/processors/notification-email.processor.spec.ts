import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import type { EmailService } from '../email.service';
import { SEND_EMAIL_JOB } from '../notifications.constants';
import { NotificationEmailProcessor } from './notification-email.processor';

describe('NotificationEmailProcessor', () => {
  let processor: NotificationEmailProcessor;
  let email: { send: jest.Mock };
  let prisma: { notification: { update: jest.Mock } };

  beforeEach(() => {
    email = { send: jest.fn().mockResolvedValue(undefined) };
    prisma = { notification: { update: jest.fn().mockResolvedValue({}) } };
    processor = new NotificationEmailProcessor(
      email as unknown as EmailService,
      prisma as unknown as PrismaService,
    );
  });

  it('ignores unexpected job names', async () => {
    await processor.process({ name: 'other', data: {} } as Job);
    expect(email.send).not.toHaveBeenCalled();
  });

  it('sends email and stamps emailSentAt when notificationId is present', async () => {
    await processor.process({
      name: SEND_EMAIL_JOB,
      data: {
        to: 'a@x.com',
        subject: 'Hello',
        text: 'Body',
        notificationId: 'n1',
      },
    } as Job);

    expect(email.send).toHaveBeenCalledWith({
      to: 'a@x.com',
      subject: 'Hello',
      text: 'Body',
      html: undefined,
    });
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: { emailSentAt: expect.any(Date) },
    });
  });

  it('skips notification update when notificationId is absent', async () => {
    await processor.process({
      name: SEND_EMAIL_JOB,
      data: { to: 'a@x.com', subject: 'Hello', text: 'Body' },
    } as Job);
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });
});
