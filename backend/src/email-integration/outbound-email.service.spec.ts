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

  it('processSend uses microsoft provider and bodyHtml', async () => {
    prisma.mailboxConnection.findFirst.mockResolvedValue({
      id: 'c1',
      provider: 'microsoft',
      emailAddress: 'attorney@firm.com',
    });
    microsoftMail.sendMail.mockResolvedValue({ providerMessageId: 'ms-1' });
    prisma.matterDocument.create.mockResolvedValue({ id: 'doc1' });
    prisma.matterDocumentVersion.create.mockResolvedValue({ id: 'ver1' });

    const result = await service.processSend({
      connectionId: 'c1',
      matterId: 'm1',
      to: ['client@example.com'],
      subject: 'Update',
      bodyText: '',
      bodyHtml: '<p>HTML body</p>',
      cc: ['cc@example.com'],
      userId: 'u1',
      roles: [SYSTEM_ROLES.COORDINATOR],
    });

    expect(microsoftMail.sendMail).toHaveBeenCalled();
    expect(result.providerMessageId).toBe('ms-1');
  });

  it('processSend marks replied correspondence and skips non-pending link', async () => {
    prisma.mailboxConnection.findFirst.mockResolvedValue({
      id: 'c1',
      provider: 'google',
      emailAddress: 'attorney@firm.com',
    });
    prisma.unlinkedEmail.findUnique.mockResolvedValue({
      status: UnlinkedEmailStatus.linked,
    });
    prisma.matterDocument.create.mockResolvedValue({ id: 'doc1' });
    prisma.matterDocumentVersion.create.mockResolvedValue({ id: 'ver1' });
    correspondence.update.mockResolvedValue({});

    const result = await service.processSend({
      connectionId: 'c1',
      matterId: 'm1',
      to: ['client@example.com'],
      subject: 'Re: Thread',
      bodyText: 'Reply',
      replyToUnlinkedEmailId: 'ue1',
      replyToCorrespondenceId: 'corr-in',
      userId: 'u1',
      roles: [SYSTEM_ROLES.COORDINATOR],
    });

    expect(unlinkedEmails.linkToMatter).not.toHaveBeenCalled();
    expect(correspondence.update).toHaveBeenCalledWith('corr-in', {
      status: CorrespondenceStatus.replied,
    });
    expect(result.linkedIncoming).toBe(false);
  });

  it('buildDraftReply from correspondence and office-action template', async () => {
    prisma.matter.findUnique
      .mockResolvedValueOnce({ id: 'm1' })
      .mockResolvedValueOnce({
        ...matterRow,
        client: {
          companyName: null,
          firstName: 'Jane',
          lastName: 'Client',
          offices: [],
        },
      });
    prisma.correspondence.findFirst.mockResolvedValue({
      subject: 'Office Action EP123',
      sender: 'examiner@epo.org',
      bodyText: 'Please respond',
      messageId: '<corr-msg>',
      category: DocumentCategory.office_action,
    });
    prisma.documentTemplate.findUnique.mockResolvedValue({
      slug: 'office-action-response-email',
      isActive: true,
      referenceLine: 'Ref: {{matterTitle}}',
      htmlBody: '<p>Dear examiner, re {{matterTitle}}</p>',
    });

    const draft = await service.buildDraftReply({
      matterId: 'm1',
      correspondenceId: 'corr1',
    });

    expect(draft.subject).toMatch(/^Re:/);
    expect(draft.templateSlug).toBe('office-action-response-email');
    expect(draft.inReplyToMessageId).toBe('<corr-msg>');
  });

  it('buildDraftReply uses metadata bodyPreview when bodyText missing', async () => {
    prisma.matter.findUnique
      .mockResolvedValueOnce({ id: 'm1' })
      .mockResolvedValueOnce(matterRow);
    prisma.unlinkedEmail.findUnique.mockResolvedValue({
      subject: 'Question',
      sender: 'client@example.com',
      internetMessageId: null,
      bodyText: null,
      suggestedCategory: null,
      metadata: { bodyPreview: 'Preview text here' },
    });

    const draft = await service.buildDraftReply({ matterId: 'm1', unlinkedEmailId: 'ue1' });

    expect(draft.quotedOriginal).toContain('Preview text');
  });

  it('enqueueAndWait allows gatekeeper on unassigned matter', async () => {
    prisma.mailboxConnection.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1', assignedToId: 'other' });

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
    ).resolves.toMatchObject({ correspondenceId: 'corr1' });
  });

  it('enqueueAndWait rejects users without send permission', async () => {
    prisma.mailboxConnection.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });

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
        ['client_portal'],
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('extended branch coverage', () => {
    it('buildDraftReply throws when queued email is missing', async () => {
      prisma.matter.findUnique.mockResolvedValueOnce({ id: 'm1' });
      prisma.unlinkedEmail.findUnique.mockResolvedValue(null);
      await expect(
        service.buildDraftReply({ matterId: 'm1', unlinkedEmailId: 'missing' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('buildDraftReply throws when correspondence is missing', async () => {
      prisma.matter.findUnique.mockResolvedValueOnce({ id: 'm1' });
      prisma.correspondence.findFirst.mockResolvedValue(null);
      await expect(
        service.buildDraftReply({ matterId: 'm1', correspondenceId: 'missing' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('buildDraftReply uses office-action template from subject even without category', async () => {
      prisma.matter.findUnique
        .mockResolvedValueOnce({ id: 'm1' })
        .mockResolvedValueOnce(matterRow);
      prisma.correspondence.findFirst.mockResolvedValue({
        subject: 'Office Action regarding EP123',
        sender: 'examiner@epo.org',
        bodyText: 'Please respond',
        messageId: '<msg>',
        category: DocumentCategory.correspondence,
      });
      prisma.documentTemplate.findUnique.mockResolvedValue({
        slug: 'office-action-response-email',
        isActive: true,
        referenceLine: null,
        htmlBody: '<p>Response for {{matterTitle}}</p>',
      });

      const draft = await service.buildDraftReply({
        matterId: 'm1',
        correspondenceId: 'corr1',
      });

      expect(draft.templateSlug).toBe('office-action-response-email');
      expect(draft.bodyHtml).toContain('Patent app');
    });

    it('buildDraftReply AI path uses client individual name and empty original body', async () => {
      prisma.matter.findUnique
        .mockResolvedValueOnce({ id: 'm1' })
        .mockResolvedValueOnce({
          ...matterRow,
          client: {
            companyName: null,
            firstName: 'Jane',
            lastName: 'Doe',
            offices: [],
          },
          jurisdictions: [],
          assignedTo: null,
        });
      ai.generateDraft.mockResolvedValue('AI generated reply');

      const draft = await service.buildDraftReply({
        matterId: 'm1',
        useAi: true,
      });

      expect(draft.usedAi).toBe(true);
      expect(draft.bodyText).toBe('AI generated reply');
      expect(ai.generateDraft).toHaveBeenCalledWith(
        expect.stringContaining('Subject:'),
        expect.stringContaining('Jane Doe'),
      );
    });

    it('enqueueAndWait allows assigned attorney on own matter', async () => {
      prisma.mailboxConnection.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.matter.findUnique
        .mockResolvedValueOnce({ id: 'm1' })
        .mockResolvedValueOnce({ assignedToId: 'u1' });

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
      ).resolves.toMatchObject({ correspondenceId: 'corr1' });
    });

    it('processSend tolerates correspondence update failure', async () => {
      prisma.mailboxConnection.findFirst.mockResolvedValue({
        id: 'c1',
        provider: 'google',
        emailAddress: 'attorney@firm.com',
      });
      prisma.matterDocument.create.mockResolvedValue({ id: 'doc1' });
      prisma.matterDocumentVersion.create.mockResolvedValue({ id: 'ver1' });
      correspondence.update.mockRejectedValue(new Error('stale row'));

      const result = await service.processSend({
        connectionId: 'c1',
        matterId: 'm1',
        to: ['client@example.com'],
        subject: 'Re: Thread',
        bodyText: 'Reply',
        replyToCorrespondenceId: 'corr-in',
        userId: 'u1',
        roles: [SYSTEM_ROLES.COORDINATOR],
      });

      expect(result.correspondenceId).toBe('corr1');
    });

    it('processSend prefers bodyHtml and includes cc in sent copy', async () => {
      prisma.mailboxConnection.findFirst.mockResolvedValue({
        id: 'c1',
        provider: 'google',
        emailAddress: 'attorney@firm.com',
      });
      prisma.matterDocument.create.mockResolvedValue({ id: 'doc1' });
      prisma.matterDocumentVersion.create.mockResolvedValue({ id: 'ver1' });

      await service.processSend({
        connectionId: 'c1',
        matterId: 'm1',
        to: ['client@example.com'],
        subject: 'Update',
        bodyText: '   ',
        bodyHtml: '<p>HTML only</p>',
        cc: ['Partner <partner@firm.com>'],
        inReplyToMessageId: '<parent>',
        isClientVisible: true,
        category: DocumentCategory.office_action,
        userId: 'u1',
        roles: [SYSTEM_ROLES.COORDINATOR],
      });

      expect(googleMail.sendMail).toHaveBeenCalledWith(
        'token',
        expect.objectContaining({
          cc: ['partner@firm.com'],
          inReplyToMessageId: '<parent>',
        }),
      );
      expect(correspondence.create).toHaveBeenCalledWith(
        'm1',
        expect.objectContaining({
          category: DocumentCategory.office_action,
          isClientVisible: true,
        }),
        'u1',
      );
    });

    it('buildDraftReply returns empty to when sender missing', async () => {
      prisma.matter.findUnique
        .mockResolvedValueOnce({ id: 'm1' })
        .mockResolvedValueOnce(matterRow);

      const draft = await service.buildDraftReply({ matterId: 'm1' });
      expect(draft.to).toEqual([]);
      expect(draft.quotedOriginal).toBeNull();
    });
  });
});
