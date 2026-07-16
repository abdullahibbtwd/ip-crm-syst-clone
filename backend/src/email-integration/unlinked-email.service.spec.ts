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

    service = new UnlinkedEmailService(
      prisma as unknown as PrismaService,
      storage as never,
      correspondence as never,
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
});
