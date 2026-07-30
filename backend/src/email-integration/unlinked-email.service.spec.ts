import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentCategory,
  UnlinkedEmailStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { UnlinkedEmailService } from './unlinked-email.service';

describe('UnlinkedEmailService', () => {
  let service: UnlinkedEmailService;
  let prisma: Record<string, any>;
  let storage: {
    getPresignedDownloadUrl: jest.Mock;
    getObjectBuffer: jest.Mock;
    putObject: jest.Mock;
    deleteObject: jest.Mock;
  };
  let correspondence: { create: jest.Mock };
  let emlParser: { parseBuffer: jest.Mock };

  const pendingRow = {
    id: 'ue1',
    status: UnlinkedEmailStatus.pending,
    subject: 'Office action',
    sender: 'examiner@epo.org',
    recipient: 'firm@example.com',
    receivedAt: new Date('2026-01-15'),
    hasAttachments: false,
    internetMessageId: '<msg-1>',
    externalMessageId: 'ext-1',
    mailboxConnectionId: 'mc1',
    emlStorageKey: 'mailbox/mc1/ext-1.eml',
    bodyText: 'Please respond',
    metadata: { bodyPreview: 'Please respond' },
    mailboxConnection: { id: 'mc1', provider: 'google', emailAddress: 'a@firm.com', userId: 'u1' },
    suggestedMatter: null,
    suggestedCategory: DocumentCategory.correspondence,
  };

  beforeEach(() => {
    prisma = {
      unlinkedEmail: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      matter: { findUnique: jest.fn() },
      matterDocument: { create: jest.fn() },
      matterDocumentVersion: { create: jest.fn() },
    };
    storage = {
      getPresignedDownloadUrl: jest.fn(),
      getObjectBuffer: jest.fn(),
      putObject: jest.fn(),
      deleteObject: jest.fn(),
    };
    correspondence = { create: jest.fn() };
    emlParser = {
      parseBuffer: jest.fn().mockResolvedValue({
        sender: pendingRow.sender,
        recipient: pendingRow.recipient,
        subject: pendingRow.subject,
        bodyText: pendingRow.bodyText,
        bodyHtml: null,
        attachments: [],
        messageId: pendingRow.internetMessageId,
      }),
    };

    const documents = {
      createClientFromBuffer: jest.fn(),
    };

    service = new UnlinkedEmailService(
      prisma as unknown as PrismaService,
      storage as never,
      correspondence as never,
      documents as never,
      emlParser as never,
    );
  });

  it('listQueue / getStats / getById', async () => {
    prisma.unlinkedEmail.findMany.mockResolvedValue([]);
    await expect(service.listQueue()).resolves.toEqual([]);

    prisma.unlinkedEmail.count.mockResolvedValue(4);
    await expect(service.getStats()).resolves.toEqual({ pending: 4 });

    prisma.unlinkedEmail.findUnique.mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('getDownloadUrl and getPreview resolve storage + parser', async () => {
    prisma.unlinkedEmail.findUnique.mockResolvedValue(pendingRow);
    storage.getPresignedDownloadUrl.mockResolvedValue('https://signed');
    storage.getObjectBuffer.mockResolvedValue(Buffer.from('eml'));

    await expect(service.getDownloadUrl('ue1')).resolves.toMatchObject({
      url: 'https://signed',
      mimeType: 'message/rfc822',
    });

    const preview = await service.getPreview('ue1');
    expect(preview.subject).toBe('Office action');
    expect(emlParser.parseBuffer).toHaveBeenCalled();
  });

  it('linkToMatter rejects unauthorized roles', async () => {
    await expect(
      service.linkToMatter('ue1', 'm1', 'u1', ['paralegal']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('linkToMatter creates correspondence for gatekeepers', async () => {
    prisma.unlinkedEmail.findUnique.mockResolvedValue(pendingRow);
    storage.getObjectBuffer.mockResolvedValue(Buffer.from('eml'));
    prisma.matterDocument.create.mockResolvedValue({ id: 'doc1' });
    prisma.matterDocumentVersion.create.mockResolvedValue({ id: 'ver1' });
    correspondence.create.mockResolvedValue({ id: 'corr1' });
    prisma.unlinkedEmail.update.mockResolvedValue({});

    const result = await service.linkToMatter(
      'ue1',
      'm1',
      'u1',
      [SYSTEM_ROLES.COORDINATOR],
      DocumentCategory.correspondence,
    );

    expect(result).toEqual({ correspondence: { id: 'corr1' }, unlinkedEmailId: 'ue1' });
    expect(correspondence.create).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({
        direction: 'incoming',
        subject: 'Office action',
      }),
      'u1',
    );
    expect(prisma.unlinkedEmail.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ue1' },
        data: expect.objectContaining({
          status: UnlinkedEmailStatus.linked,
          linkedCorrespondenceId: 'corr1',
        }),
      }),
    );
  });

  it('dismiss marks row dismissed and deletes staging object', async () => {
    prisma.unlinkedEmail.findUnique.mockResolvedValue(pendingRow);
    prisma.unlinkedEmail.update.mockResolvedValue({
      ...pendingRow,
      status: UnlinkedEmailStatus.dismissed,
    });

    await service.dismiss('ue1', 'u1', [SYSTEM_ROLES.DOCKETING_ADMIN]);

    expect(storage.deleteObject).toHaveBeenCalledWith(pendingRow.emlStorageKey);
    expect(prisma.unlinkedEmail.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: UnlinkedEmailStatus.dismissed,
        }),
      }),
    );
  });

  it('dismiss rejects unauthorized roles', async () => {
    prisma.unlinkedEmail.findUnique.mockResolvedValue(pendingRow);
    await expect(
      service.dismiss('ue1', 'u1', ['paralegal']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('dismiss continues when storage delete fails', async () => {
    prisma.unlinkedEmail.findUnique.mockResolvedValue(pendingRow);
    storage.deleteObject.mockRejectedValue(new Error('minio down'));
    prisma.unlinkedEmail.update.mockResolvedValue({
      ...pendingRow,
      status: UnlinkedEmailStatus.dismissed,
    });

    await expect(
      service.dismiss('ue1', 'u1', [SYSTEM_ROLES.COORDINATOR]),
    ).resolves.toMatchObject({ status: UnlinkedEmailStatus.dismissed });
  });

  it('linkToMatter rejects already processed email', async () => {
    prisma.unlinkedEmail.findUnique.mockResolvedValue({
      ...pendingRow,
      status: UnlinkedEmailStatus.linked,
    });
    await expect(
      service.linkToMatter('ue1', 'm1', 'u1', [SYSTEM_ROLES.COORDINATOR]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('linkToMatter blocks attorney on unassigned matter', async () => {
    prisma.matter.findUnique.mockResolvedValue({ assignedToId: 'other' });
    await expect(
      service.linkToMatter('ue1', 'm1', 'u1', [SYSTEM_ROLES.IP_ATTORNEY]),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('linkToMatter allows attorney on assigned matter', async () => {
    prisma.matter.findUnique.mockResolvedValue({ assignedToId: 'u1' });
    prisma.unlinkedEmail.findUnique.mockResolvedValue(pendingRow);
    storage.getObjectBuffer.mockResolvedValue(Buffer.from('eml'));
    prisma.matterDocument.create.mockResolvedValue({ id: 'doc1' });
    prisma.matterDocumentVersion.create.mockResolvedValue({ id: 'ver1' });
    correspondence.create.mockResolvedValue({ id: 'corr1' });
    prisma.unlinkedEmail.update.mockResolvedValue({});

    await expect(
      service.linkToMatter('ue1', 'm1', 'u1', [SYSTEM_ROLES.IP_ATTORNEY]),
    ).resolves.toMatchObject({ unlinkedEmailId: 'ue1' });
  });

  it('getPreview falls back to row fields and detects attachments', async () => {
    prisma.unlinkedEmail.findUnique.mockResolvedValue({
      ...pendingRow,
      bodyText: null,
      hasAttachments: false,
    });
    storage.getObjectBuffer.mockResolvedValue(Buffer.from('eml'));
    emlParser.parseBuffer.mockResolvedValue({
      sender: '',
      recipient: '',
      subject: '',
      bodyText: null,
      bodyHtml: '<p>html</p>',
      attachments: [{ fileName: 'a.pdf' }],
      messageId: null,
    });

    const preview = await service.getPreview('ue1');
    expect(preview.sender).toBe(pendingRow.sender);
    expect(preview.subject).toBe('Office action');
    expect(preview.hasAttachments).toBe(true);
  });

  it('getDownloadUrl sanitizes empty subject filename', async () => {
    prisma.unlinkedEmail.findUnique.mockResolvedValue({
      ...pendingRow,
      subject: '',
    });
    storage.getPresignedDownloadUrl.mockResolvedValue('https://signed');

    const result = await service.getDownloadUrl('ue1');
    expect(result.fileName).toBe('email.eml');
  });

  describe('extended branch coverage', () => {
    it('listQueue filters by status enum', async () => {
      prisma.unlinkedEmail.findMany.mockResolvedValue([]);
      await service.listQueue(UnlinkedEmailStatus.pending);
      expect(prisma.unlinkedEmail.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: UnlinkedEmailStatus.pending },
        }),
      );
    });

    it('linkToMatter allows managing partner on unassigned matter', async () => {
      prisma.unlinkedEmail.findUnique.mockResolvedValue(pendingRow);
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1', assignedToId: null });
      storage.getObjectBuffer.mockResolvedValue(Buffer.from('eml'));
      prisma.matterDocument.create.mockResolvedValue({ id: 'doc1' });
      prisma.matterDocumentVersion.create.mockResolvedValue({ id: 'ver1' });
      correspondence.create.mockResolvedValue({ id: 'corr1' });
      prisma.unlinkedEmail.update.mockResolvedValue({});

      await service.linkToMatter(
        'ue1',
        'm1',
        'mp1',
        [SYSTEM_ROLES.MANAGING_PARTNER],
        DocumentCategory.correspondence,
      );

      expect(correspondence.create).toHaveBeenCalled();
    });

    it('getStats returns pending count', async () => {
      prisma.unlinkedEmail.count.mockResolvedValue(3);
      await expect(service.getStats()).resolves.toEqual({ pending: 3 });
    });

    it('getById throws when row missing', async () => {
      prisma.unlinkedEmail.findUnique.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('linkToMatter allows trademark attorney on assigned matter', async () => {
      prisma.matter.findUnique.mockResolvedValue({ assignedToId: 'u1' });
      prisma.unlinkedEmail.findUnique.mockResolvedValue(pendingRow);
      storage.getObjectBuffer.mockResolvedValue(Buffer.from('eml'));
      prisma.matterDocument.create.mockResolvedValue({ id: 'doc1' });
      prisma.matterDocumentVersion.create.mockResolvedValue({ id: 'ver1' });
      correspondence.create.mockResolvedValue({ id: 'corr1' });
      prisma.unlinkedEmail.update.mockResolvedValue({});

      await service.linkToMatter(
        'ue1',
        'm1',
        'u1',
        [SYSTEM_ROLES.TRADEMARK_ATTORNEY],
      );
      expect(correspondence.create).toHaveBeenCalled();
    });

    it('linkToMatter throws when matter is missing for attorney', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(
        service.linkToMatter('ue1', 'm1', 'u1', [SYSTEM_ROLES.IP_ATTORNEY]),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('linkToMatter uses metadata bodyPreview when parser returns no text', async () => {
      prisma.unlinkedEmail.findUnique.mockResolvedValue({
        ...pendingRow,
        bodyText: null,
        metadata: { bodyPreview: 'Preview fallback text' },
      });
      storage.getObjectBuffer.mockResolvedValue(Buffer.from('eml'));
      emlParser.parseBuffer.mockResolvedValue({
        sender: pendingRow.sender,
        recipient: pendingRow.recipient,
        subject: pendingRow.subject,
        bodyText: null,
        bodyHtml: null,
        attachments: [],
        messageId: null,
      });
      prisma.matterDocument.create.mockResolvedValue({ id: 'doc1' });
      prisma.matterDocumentVersion.create.mockResolvedValue({ id: 'ver1' });
      correspondence.create.mockResolvedValue({ id: 'corr1' });
      prisma.unlinkedEmail.update.mockResolvedValue({});

      await service.linkToMatter(
        'ue1',
        'm1',
        'u1',
        [SYSTEM_ROLES.COORDINATOR],
      );

      expect(correspondence.create).toHaveBeenCalledWith(
        'm1',
        expect.objectContaining({ bodyText: 'Preview fallback text' }),
        'u1',
      );
    });

    it('getPreview uses Unknown sender when all sources empty', async () => {
      prisma.unlinkedEmail.findUnique.mockResolvedValue({
        ...pendingRow,
        sender: '',
        subject: '',
      });
      storage.getObjectBuffer.mockResolvedValue(Buffer.from('eml'));
      emlParser.parseBuffer.mockResolvedValue({
        sender: '',
        recipient: '',
        subject: '',
        bodyText: 'body',
        bodyHtml: null,
        attachments: [],
        messageId: null,
      });

      const preview = await service.getPreview('ue1');
      expect(preview.sender).toBe('Unknown sender');
      expect(preview.subject).toBe('(No subject)');
    });

    it('linkToMatter uses parsed messageId when row internetMessageId absent', async () => {
      prisma.unlinkedEmail.findUnique.mockResolvedValue({
        ...pendingRow,
        internetMessageId: null,
      });
      storage.getObjectBuffer.mockResolvedValue(Buffer.from('eml'));
      emlParser.parseBuffer.mockResolvedValue({
        sender: pendingRow.sender,
        recipient: pendingRow.recipient,
        subject: pendingRow.subject,
        bodyText: pendingRow.bodyText,
        bodyHtml: null,
        attachments: [],
        messageId: '<parsed-id>',
      });
      prisma.matterDocument.create.mockResolvedValue({ id: 'doc1' });
      prisma.matterDocumentVersion.create.mockResolvedValue({ id: 'ver1' });
      correspondence.create.mockResolvedValue({ id: 'corr1' });
      prisma.unlinkedEmail.update.mockResolvedValue({});

      await service.linkToMatter(
        'ue1',
        'm1',
        'u1',
        [SYSTEM_ROLES.COORDINATOR],
      );

      expect(correspondence.create).toHaveBeenCalledWith(
        'm1',
        expect.objectContaining({ messageId: '<parsed-id>' }),
        'u1',
      );
    });
  });
});
