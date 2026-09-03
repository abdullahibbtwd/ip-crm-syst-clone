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
  let storage: {
    getPresignedDownloadUrl: jest.Mock;
    putObject: jest.Mock;
    getObjectBuffer: jest.Mock;
  };
  let pdfRenderer: { renderHtmlToPdf: jest.Mock };
  let documentTemplates: {
    findById: jest.Mock;
    ensurePoaTemplate: jest.Mock;
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
      getObjectBuffer: jest.fn().mockResolvedValue(Buffer.from('img')),
    };
    pdfRenderer = {
      renderHtmlToPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
    };
    documentTemplates = {
      findById: jest.fn(),
      ensurePoaTemplate: jest.fn(),
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
    await expect(service.getFileContents('d1')).resolves.toMatchObject({
      fileName: 'a.pdf',
      mimeType: 'application/pdf',
    });
    expect(storage.getObjectBuffer).toHaveBeenCalledWith('k');
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

    expect(documentTemplates.renderForMatter).toHaveBeenCalledWith(
      'tpl-1',
      'm1',
      undefined,
    );
    expect(pdfRenderer.renderHtmlToPdf).toHaveBeenCalled();
    expect(result.versionCount).toBe(1);
  });

  it('generateFromTemplate ensures the POA template when templateId is omitted', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    documentTemplates.ensurePoaTemplate.mockResolvedValue({
      id: 'poa-1',
      name: 'Power of Attorney',
      slug: 'power-of-attorney',
      category: DocumentCategory.application,
      docxStorageKey: null,
    });
    prisma.matterDocument.create.mockResolvedValue({
      id: 'd-poa',
      matterId: 'm1',
      displayName: 'Power of Attorney',
      category: DocumentCategory.application,
      tags: ['generated', 'power-of-attorney'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.matterDocumentVersion.create.mockResolvedValue({
      id: 'v1',
      version: 1,
      fileName: 'power-of-attorney-2025-01-01.pdf',
      mimeType: 'application/pdf',
      uploadedBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
    });

    await service.generateFromTemplate('m1', undefined, 'u1', 'pdf', {
      legalEntityName: 'Acme EOOD',
    });

    expect(documentTemplates.ensurePoaTemplate).toHaveBeenCalled();
    expect(documentTemplates.renderForMatter).toHaveBeenCalledWith('poa-1', 'm1', {
      legalEntityName: 'Acme EOOD',
    });
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

    expect(documentTemplates.renderDocxForMatter).toHaveBeenCalledWith(
      'tpl-1',
      'm1',
      undefined,
    );
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

  it('listForMatter applies search filter', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.matterDocument.findMany.mockResolvedValue([]);
    await service.listForMatter('m1', { search: 'spec' } as never);
    expect(prisma.matterDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      }),
    );
  });

  it('getDownloadUrl resolves specific version', async () => {
    prisma.matterDocument.findUnique.mockResolvedValue({
      matter: { clientId: 'c1' },
    });
    prisma.matterDocumentVersion.findFirst.mockResolvedValue({
      id: 'v2',
      storageKey: 'k2',
      fileName: 'b.pdf',
      mimeType: 'application/pdf',
      version: 2,
    });

    const result = await service.getDownloadUrl('d1', 'v2');
    expect(result.version).toBe(2);
    expect(prisma.matterDocumentVersion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'v2', documentId: 'd1' } }),
    );
  });

  it('getDownloadUrl throws when version missing', async () => {
    prisma.matterDocument.findUnique.mockResolvedValue({
      matter: { clientId: 'c1' },
    });
    prisma.matterDocumentVersion.findFirst.mockResolvedValue(null);
    await expect(service.getDownloadUrl('d1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('uploadVersion throws when document missing', async () => {
    prisma.matterDocument.findUnique.mockResolvedValue(null);
    const file = {
      buffer: Buffer.from('pdf'),
      size: 4,
      mimetype: 'application/pdf',
      originalname: 'rev.pdf',
    } as Express.Multer.File;
    await expect(service.uploadVersion('missing', file, 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('upload rejects empty file buffer', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    const file = {
      buffer: Buffer.alloc(0),
      size: 0,
      mimetype: 'application/pdf',
      originalname: 'empty.pdf',
    } as Express.Multer.File;
    await expect(
      service.upload('m1', file, { category: DocumentCategory.application } as never, 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('generateFromTemplate rejects docx when template has no docx', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    documentTemplates.findById.mockResolvedValue({
      id: 'tpl-1',
      name: 'Letter',
      slug: 'letter',
      category: DocumentCategory.correspondence,
      docxStorageKey: null,
    });
    await expect(
      service.generateFromTemplate('m1', 'tpl-1', 'u1', 'docx'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('generateFromTemplate rolls back on storage failure', async () => {
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
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    storage.putObject.mockRejectedValue(new Error('storage down'));

    await expect(
      service.generateFromTemplate('m1', 'tpl-1', 'u1', 'pdf'),
    ).rejects.toThrow('storage down');
    expect(prisma.matterDocument.delete).toHaveBeenCalledWith({
      where: { id: 'd-gen' },
    });
  });

  describe('extended branch coverage', () => {
    it('listFirmWide applies search and category filters', async () => {
      prisma.matterDocument.findMany.mockResolvedValue([]);
      await service.listFirmWide({ search: 'contract', category: 'correspondence' } as never);
      expect(prisma.matterDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
            category: 'correspondence',
          }),
        }),
      );
    });

    it('listForPortalClient scopes to client id', async () => {
      prisma.matterDocument.findMany.mockResolvedValue([]);
      await service.listForPortalClient('c1', {} as never);
      expect(prisma.matterDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            matter: { clientId: 'c1' },
          }),
        }),
      );
    });

    it('upload accepts docx mime type', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.matterDocument.create.mockResolvedValue({
        id: 'd1',
        matterId: 'm1',
        displayName: 'Brief',
        category: DocumentCategory.correspondence,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.matterDocumentVersion.create.mockResolvedValue({ id: 'v1' });

      await service.upload(
        'm1',
        {
          buffer: Buffer.from('docx'),
          mimetype:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          originalname: 'brief.docx',
          size: 10,
        } as Express.Multer.File,
        { displayName: 'Brief' } as never,
        'u1',
      );

      expect(storage.putObject).toHaveBeenCalled();
    });

    it('getDownloadUrl uses latest version when versionId omitted', async () => {
      prisma.matterDocument.findUnique.mockResolvedValue({
        id: 'd1',
        matter: { clientId: 'c1' },
      });
      prisma.matterDocumentVersion.findFirst.mockResolvedValue({
        id: 'v2',
        storageKey: 'k2',
        fileName: 'f.pdf',
        mimeType: 'application/pdf',
        version: 2,
      });
      storage.getPresignedDownloadUrl.mockResolvedValue('https://signed');
      const result = await service.getDownloadUrl('d1');
      expect(result.url).toBe('https://signed');
    });

    it('createFromBuffer rejects oversize files', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      const huge = Buffer.alloc(51 * 1024 * 1024);
      await expect(
        service.createFromBuffer({
          matterId: 'm1',
          userId: 'u1',
          displayName: 'Big',
          category: DocumentCategory.correspondence,
          tags: [],
          fileName: 'big.pdf',
          mimeType: 'application/pdf',
          buffer: huge,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('createFromBuffer rolls back document on storage failure', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.matterDocument.create.mockResolvedValue({
        id: 'd-new',
        matterId: 'm1',
        displayName: 'File',
        category: DocumentCategory.correspondence,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      storage.putObject.mockRejectedValue(new Error('storage fail'));

      await expect(
        service.createFromBuffer({
          matterId: 'm1',
          userId: 'u1',
          displayName: 'File',
          category: DocumentCategory.correspondence,
          tags: [],
          fileName: 'f.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('pdf'),
        }),
      ).rejects.toThrow('storage fail');
      expect(prisma.matterDocument.delete).toHaveBeenCalledWith({
        where: { id: 'd-new' },
      });
    });

    it('listForMatter applies category filter from query', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.matterDocument.findMany.mockResolvedValue([]);
      await service.listForMatter('m1', { category: DocumentCategory.filing } as never);
      expect(prisma.matterDocument.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            matterId: 'm1',
            category: DocumentCategory.filing,
          }),
        }),
      );
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
      });

      await service.uploadVersion(
        'd1',
        {
          buffer: Buffer.from('pdf'),
          mimetype: 'application/pdf',
          originalname: 'rev.pdf',
          size: 3,
        } as Express.Multer.File,
        'u1',
      );

      expect(prisma.matterDocumentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 3 }),
        }),
      );
    });

    it('getDownloadUrl throws when document missing', async () => {
      prisma.matterDocument.findUnique.mockResolvedValue(null);
      await expect(service.getDownloadUrl('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
