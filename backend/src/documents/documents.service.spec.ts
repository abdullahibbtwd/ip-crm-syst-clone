import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentCategory } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from './documents.service';
import type { DocumentTemplatesService } from './document-templates.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: {
    matter: { findUnique: jest.Mock };
    matterDocument: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    matterDocumentVersion: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };
  let storage: { getPresignedDownloadUrl: jest.Mock; putObject: jest.Mock };
  let pdfRenderer: { renderHtmlToPdf: jest.Mock };
  let documentTemplates: {
    findById: jest.Mock;
    renderForMatter: jest.Mock;
    renderDocxForMatter: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      matter: { findUnique: jest.fn() },
      matterDocument: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      matterDocumentVersion: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    storage = {
      getPresignedDownloadUrl: jest.fn().mockResolvedValue('https://dl'),
      putObject: jest.fn().mockResolvedValue(undefined),
    };
    pdfRenderer = {
      renderHtmlToPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };
    documentTemplates = {
      findById: jest.fn(),
      renderForMatter: jest.fn().mockResolvedValue('<html>letter</html>'),
      renderDocxForMatter: jest.fn().mockResolvedValue(Buffer.from('docx')),
    };
    service = new DocumentsService(
      prisma as unknown as PrismaService,
      storage as never,
      pdfRenderer as never,
      documentTemplates as unknown as DocumentTemplatesService,
    );
  });

  it('listForMatter maps documents', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.matterDocument.findMany.mockResolvedValue([
      {
        id: 'd1',
        matterId: 'm1',
        displayName: 'Spec',
        category: 'filing',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'u1' },
        versions: [{ id: 'v1', version: 1 }],
        _count: { versions: 1 },
      },
    ]);

    const rows = await service.listForMatter('m1', {} as never);
    expect(rows[0]).toMatchObject({
      id: 'd1',
      displayName: 'Spec',
      versionCount: 1,
    });
  });

  it('listForMatter throws when matter missing', async () => {
    prisma.matter.findUnique.mockResolvedValue(null);
    await expect(
      service.listForMatter('missing', {} as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listFirmWide / listForPortalClient query prisma', async () => {
    prisma.matterDocument.findMany.mockResolvedValue([]);
    await service.listFirmWide({ matterId: 'm1' } as never);
    await service.listForPortalClient('c1', {} as never);
    expect(prisma.matterDocument.findMany).toHaveBeenCalledTimes(2);
  });

  it('listVersions / getDownloadUrl', async () => {
    prisma.matterDocument.findUnique.mockResolvedValue({
      id: 'd1',
      matter: { clientId: 'c1' },
    });
    prisma.matterDocumentVersion.findMany.mockResolvedValue([{ id: 'v1' }]);
    prisma.matterDocumentVersion.findFirst.mockResolvedValue({
      id: 'v1',
      storageKey: 'k',
      fileName: 'a.pdf',
      mimeType: 'application/pdf',
      version: 1,
    });

    await expect(service.listVersions('d1')).resolves.toEqual([{ id: 'v1' }]);
    await expect(service.getDownloadUrl('d1')).resolves.toMatchObject({
      url: 'https://dl',
      fileName: 'a.pdf',
    });
  });

  it('upload creates document and first version', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.matterDocument.create.mockResolvedValue({
      id: 'd-new',
      matterId: 'm1',
      displayName: 'Spec.pdf',
      category: DocumentCategory.application,
      tags: ['draft'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.matterDocumentVersion.create.mockResolvedValue({
      id: 'v1',
      version: 1,
      fileName: 'spec.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4,
      storageKey: 'matters/m1/d-new/v1/spec.pdf',
      uploadedBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
    });

    const file = {
      buffer: Buffer.from('pdf'),
      size: 4,
      mimetype: 'application/pdf',
      originalname: 'spec.pdf',
    } as Express.Multer.File;

    const result = await service.upload(
      'm1',
      file,
      {
        displayName: 'Spec.pdf',
        category: DocumentCategory.application,
        tags: 'draft',
      } as never,
      'u1',
    );

    expect(storage.putObject).toHaveBeenCalled();
    expect(result.versionCount).toBe(1);
    expect(result.displayName).toBe('Spec.pdf');
  });

  it('createFromBuffer rolls back document on storage failure', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.matterDocument.create.mockResolvedValue({
      id: 'd-new',
      matterId: 'm1',
      displayName: 'Auto',
      category: DocumentCategory.correspondence,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    storage.putObject.mockRejectedValue(new Error('storage down'));

    await expect(
      service.createFromBuffer({
        matterId: 'm1',
        userId: 'u1',
        displayName: 'Auto',
        category: DocumentCategory.correspondence,
        tags: [],
        fileName: 'auto.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('pdf'),
      }),
    ).rejects.toThrow('storage down');

    expect(prisma.matterDocument.delete).toHaveBeenCalledWith({
      where: { id: 'd-new' },
    });
  });

  it('uploadVersion increments version number', async () => {
    prisma.matterDocument.findUnique.mockResolvedValue({
      id: 'd1',
      matterId: 'm1',
      versions: [{ version: 2 }],
    });
    prisma.matterDocumentVersion.create.mockResolvedValue({
      id: 'v3',
      version: 3,
      fileName: 'rev.pdf',
    });
    prisma.matterDocument.update.mockResolvedValue({});

    const file = {
      buffer: Buffer.from('pdf'),
      size: 4,
      mimetype: 'application/pdf',
      originalname: 'rev.pdf',
    } as Express.Multer.File;

    const version = await service.uploadVersion('d1', file, 'u1');

    expect(version.version).toBe(3);
    expect(storage.putObject).toHaveBeenCalled();
    expect(prisma.matterDocument.update).toHaveBeenCalled();
  });

  it('generateFromTemplate creates PDF document from template', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    documentTemplates.findById.mockResolvedValue({
      id: 'tpl-1',
      name: 'Cover Letter',
      slug: 'cover-letter',
      category: DocumentCategory.correspondence,
      docxStorageKey: null,
    });
    prisma.matterDocument.create.mockResolvedValue({
      id: 'd-gen',
      matterId: 'm1',
      displayName: 'Cover Letter',
      category: DocumentCategory.correspondence,
      tags: ['generated', 'cover-letter'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.matterDocumentVersion.create.mockResolvedValue({
      id: 'v1',
      version: 1,
      fileName: 'cover-letter-2025-01-01.pdf',
      mimeType: 'application/pdf',
      uploadedBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
    });

    const result = await service.generateFromTemplate('m1', 'tpl-1', 'u1', 'pdf');

    expect(documentTemplates.renderForMatter).toHaveBeenCalledWith('tpl-1', 'm1');
    expect(pdfRenderer.renderHtmlToPdf).toHaveBeenCalled();
    expect(result.versionCount).toBe(1);
  });

  it('generateFromTemplate uses docx path when format is docx', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    documentTemplates.findById.mockResolvedValue({
      id: 'tpl-1',
      name: 'Cover Letter',
      slug: 'cover-letter',
      category: DocumentCategory.correspondence,
      docxStorageKey: 'document-templates/tpl-1/template.docx',
    });
    prisma.matterDocument.create.mockResolvedValue({
      id: 'd-gen',
      matterId: 'm1',
      displayName: 'Cover Letter',
      category: DocumentCategory.correspondence,
      tags: ['generated', 'cover-letter'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.matterDocumentVersion.create.mockResolvedValue({
      id: 'v1',
      version: 1,
      uploadedBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
    });

    await service.generateFromTemplate('m1', 'tpl-1', 'u1', 'docx');

    expect(documentTemplates.renderDocxForMatter).toHaveBeenCalledWith('tpl-1', 'm1');
    expect(pdfRenderer.renderHtmlToPdf).not.toHaveBeenCalled();
  });

  it('upload rejects disallowed mime types', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });

    const file = {
      buffer: Buffer.from('x'),
      size: 1,
      mimetype: 'application/x-msdownload',
      originalname: 'bad.exe',
    } as Express.Multer.File;

    await expect(
      service.upload('m1', file, { category: DocumentCategory.application } as never, 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
