jest.mock('bullmq', () => {
  const actual = jest.requireActual('bullmq');
  return {
    ...actual,
    QueueEvents: jest.fn().mockImplementation(() => ({})),
  };
});

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CorrespondenceStatus,
  DocumentCategory,
  UnlinkedEmailStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { OutboundEmailService } from './outbound-email.service';

describe('OutboundEmailService', () => {
  let service: OutboundEmailService;
  let prisma: Record<string, any>;
  let outboundQueue: { add: jest.Mock };
  let connections: { getAccessToken: jest.Mock };
  let microsoftMail: { sendMail: jest.Mock };
  let googleMail: { sendMail: jest.Mock };
  let correspondence: { create: jest.Mock; update: jest.Mock };
  let unlinkedEmails: { linkToMatter: jest.Mock };
  let storage: { putObject: jest.Mock };
  let ai: { generateDraft: jest.Mock };

  const matterRow = {
    id: 'm1',
    title: 'Patent app',
    matterType: 'patent',
    client: {
      companyName: 'Acme',
      firstName: null,
      lastName: null,
      offices: [],
    },
    assignedTo: { fullName: 'Alex Attorney' },
    jurisdictions: [{ countryCode: 'EP' }],
    ipRights: [],
  };

  beforeEach(() => {
    prisma = {
      mailboxConnection: { findFirst: jest.fn() },
      matter: { findUnique: jest.fn() },
      unlinkedEmail: { findUnique: jest.fn() },
      correspondence: { findFirst: jest.fn() },
      documentTemplate: { findUnique: jest.fn() },
      matterDocument: { create: jest.fn() },
      matterDocumentVersion: { create: jest.fn() },
    };
    outboundQueue = {
      add: jest.fn().mockResolvedValue({
        waitUntilFinished: jest.fn().mockResolvedValue({
          correspondenceId: 'corr1',
          matterId: 'm1',
          providerMessageId: 'msg-1',
          linkedIncoming: false,
        }),
      }),
    };
    connections = { getAccessToken: jest.fn().mockResolvedValue('token') };
    microsoftMail = { sendMail: jest.fn() };
    googleMail = {
      sendMail: jest.fn().mockResolvedValue({ providerMessageId: 'g-msg-1' }),
    };
    correspondence = {
      create: jest.fn().mockResolvedValue({ id: 'corr1' }),
      update: jest.fn(),
    };
    unlinkedEmails = { linkToMatter: jest.fn() };
    storage = { putObject: jest.fn() };
    ai = { generateDraft: jest.fn() };

    service = new OutboundEmailService(
      outboundQueue as never,
      {
        get: jest.fn((key: string, fallback?: string) => {
          if (key === 'REDIS_PORT') return '6379';
          if (key === 'REDIS_HOST') return 'localhost';
          return fallback;
        }),
      } as unknown as ConfigService,
      prisma as unknown as PrismaService,
      connections as never,
      microsoftMail as never,
      googleMail as never,
      correspondence as never,
      unlinkedEmails as never,
      storage as never,
      ai as never,
    );
  });

  it('buildDraftReply requires matter and builds default stub', async () => {
    prisma.matter.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.buildDraftReply({ matterId: 'm1' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.matter.findUnique
      .mockResolvedValueOnce({ id: 'm1' })
      .mockResolvedValueOnce(matterRow);
    const draft = await service.buildDraftReply({ matterId: 'm1' });

    expect(draft.subject).toMatch(/^Re:/);
    expect(draft.bodyText).toContain('Thank you for your email');
    expect(draft.usedAi).toBe(false);
  });

  it('buildDraftReply uses queued email context and AI when requested', async () => {
    prisma.matter.findUnique
      .mockResolvedValueOnce({ id: 'm1' })
      .mockResolvedValueOnce(matterRow);
    prisma.unlinkedEmail.findUnique.mockResolvedValue({
      id: 'ue1',
      subject: 'Office action EP123',
      sender: 'Examiner <examiner@epo.org>',
      internetMessageId: '<in-reply>',
      bodyText: 'Please respond by deadline',
      suggestedCategory: DocumentCategory.office_action,
      metadata: null,
    });
    ai.generateDraft.mockResolvedValue('AI draft body');

    const draft = await service.buildDraftReply({
      matterId: 'm1',
      unlinkedEmailId: 'ue1',
      useAi: true,
    });

    expect(draft.to).toEqual(['examiner@epo.org']);
    expect(draft.inReplyToMessageId).toBe('<in-reply>');
    expect(draft.bodyText).toBe('AI draft body');
    expect(draft.usedAi).toBe(true);
    expect(ai.generateDraft).toHaveBeenCalled();
  });

  it('enqueueAndWait validates mailbox connection before queueing', async () => {
    prisma.mailboxConnection.findFirst.mockResolvedValue(null);
    await expect(
      service.enqueueAndWait(
        {
          connectionId: 'c1',
          matterId: 'm1',
          to: ['client@example.com'],
          subject: 'Hi',
          bodyText: 'Body',
        } as never,
        'u1',
        [SYSTEM_ROLES.PARALEGAL],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enqueueAndWait blocks attorneys on unassigned matters', async () => {
    prisma.mailboxConnection.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.matter.findUnique
      .mockResolvedValueOnce({ id: 'm1' })
      .mockResolvedValueOnce({ assignedToId: 'other-user' });

    await expect(
      service.enqueueAndWait(
        {
          connectionId: 'c1',
          matterId: 'm1',
          to: ['client@example.com'],
          subject: 'Hi',
          bodyText: 'Body',
        } as never,
        'u1',
        [SYSTEM_ROLES.IP_ATTORNEY],
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('enqueueAndWait adds job and waits for completion', async () => {
    prisma.mailboxConnection.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1', assignedToId: 'u1' });

    const dto = {
      connectionId: 'c1',
      matterId: 'm1',
      to: ['client@example.com'],
      subject: 'Hi',
      bodyText: 'Body',
    };

    await expect(
      service.enqueueAndWait(
        dto as never,
        'u1',
        [SYSTEM_ROLES.IP_ATTORNEY],
      ),
    ).resolves.toMatchObject({
      correspondenceId: 'corr1',
      matterId: 'm1',
    });
    expect(outboundQueue.add).toHaveBeenCalled();
  });

  it('processSend rejects missing active connection', async () => {
    prisma.mailboxConnection.findFirst.mockResolvedValue(null);
    await expect(
      service.processSend({
        connectionId: 'c1',
        matterId: 'm1',
        to: ['client@example.com'],
        subject: 'Hi',
        bodyText: 'Body',
        userId: 'u1',
        roles: [SYSTEM_ROLES.COORDINATOR],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('processSend sends via google and records correspondence', async () => {
    prisma.mailboxConnection.findFirst.mockResolvedValue({
      id: 'c1',
      provider: 'google',
      emailAddress: 'attorney@firm.com',
    });
    prisma.unlinkedEmail.findUnique.mockResolvedValue({
      status: UnlinkedEmailStatus.pending,
    });
    prisma.matterDocument.create.mockResolvedValue({ id: 'doc1' });
    prisma.matterDocumentVersion.create.mockResolvedValue({ id: 'ver1' });

    const result = await service.processSend({
      connectionId: 'c1',
      matterId: 'm1',
      to: ['Client <client@example.com>'],
      subject: 'Re: Update',
      bodyText: 'Thanks',
      replyToUnlinkedEmailId: 'ue1',
      userId: 'u1',
      roles: [SYSTEM_ROLES.COORDINATOR],
    });

    expect(googleMail.sendMail).toHaveBeenCalled();
    expect(unlinkedEmails.linkToMatter).toHaveBeenCalled();
    expect(correspondence.create).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({
        status: CorrespondenceStatus.sent,
        sender: 'attorney@firm.com',
      }),
      'u1',
    );
    expect(result).toMatchObject({
      correspondenceId: 'corr1',
      linkedIncoming: true,
      providerMessageId: 'g-msg-1',
    });
  });
});
