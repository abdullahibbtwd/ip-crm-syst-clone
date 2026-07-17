import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { DocumentCategory } from '../../generated/prisma/client';
import { PdfRendererService } from '../pdf/pdf-renderer.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioStorageService } from '../storage/minio-storage.service';
import { DocumentTemplatesService } from './document-templates.service';
import { DocxTemplateService } from './docx-template.service';

const VALID_HTML = '<p>Dear {{clientName}}, re {{matterTitle}}</p>';

function templateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tpl-1',
    slug: 'cover-letter',
    name: 'Cover Letter',
    category: DocumentCategory.correspondence,
    description: null,
    referenceLine: 'Ref: {{matterTitle}}',
    htmlBody: VALID_HTML,
    isActive: true,
    docxStorageKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function matterRow() {
  return {
    id: 'm1',
    title: 'TM Matter',
    matterType: 'trademark',
    client: {
      id: 'c1',
      companyName: 'Acme',
      firstName: null,
      lastName: null,
      internalCode: 'CL-1',
      type: 'company',
      offices: [],
    },
    assignedTo: { fullName: 'Ada', email: 'ada@firm.com' },
    jurisdictions: [{ countryCode: 'EU' }],
    ipRights: [{ title: 'TM-1', registrationNumber: 'R-1', filingDate: null }],
  };
}

describe('DocumentTemplatesService', () => {
  let service: DocumentTemplatesService;
  let prisma: {
    documentTemplate: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    matter: { findUnique: jest.Mock };
  };
  let pdfRenderer: { renderHtmlToPdf: jest.Mock };
  let storage: {
    putObject: jest.Mock;
    deleteObject: jest.Mock;
    getObjectBuffer: jest.Mock;
  };
  let docxTemplates: { renderDocx: jest.Mock };

  beforeEach(() => {
    prisma = {
      documentTemplate: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      matter: { findUnique: jest.fn() },
    };
    pdfRenderer = { renderHtmlToPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')) };
    storage = {
      putObject: jest.fn().mockResolvedValue(undefined),
      deleteObject: jest.fn().mockResolvedValue(undefined),
      getObjectBuffer: jest.fn().mockResolvedValue(Buffer.from('docx')),
    };
    docxTemplates = {
      renderDocx: jest.fn().mockResolvedValue(Buffer.from('rendered-docx')),
    };

    service = new DocumentTemplatesService(
      prisma as unknown as PrismaService,
      pdfRenderer as unknown as PdfRendererService,
      storage as unknown as MinioStorageService,
      docxTemplates as unknown as DocxTemplateService,
    );
  });

  it('listActive / listAll map hasDocx flag', async () => {
    prisma.documentTemplate.findMany
      .mockResolvedValueOnce([
        { id: 't1', slug: 'a', name: 'A', category: 'correspondence', description: null, docxStorageKey: 'k' },
      ])
      .mockResolvedValueOnce([
        {
          id: 't1',
          slug: 'a',
          name: 'A',
          category: 'correspondence',
          description: null,
          isActive: true,
          updatedAt: new Date(),
          createdAt: new Date(),
          docxStorageKey: null,
        },
      ]);

    await expect(service.listActive()).resolves.toEqual([
      expect.objectContaining({ id: 't1', hasDocx: true }),
    ]);
    await expect(service.listAll()).resolves.toEqual([
      expect.objectContaining({ id: 't1', hasDocx: false }),
    ]);
  });

  it('mergeFieldKeys returns known keys', () => {
    const keys = service.mergeFieldKeys();
    expect(keys).toContain('clientName');
    expect(keys).toContain('matterTitle');
  });

  it('findById / findByIdAdmin', async () => {
    prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());

    await expect(service.findById('tpl-1')).resolves.toMatchObject({ id: 'tpl-1' });
    await expect(service.findByIdAdmin('tpl-1')).resolves.toMatchObject({ id: 'tpl-1' });
  });

  it('findById throws when inactive or missing', async () => {
    prisma.documentTemplate.findUnique.mockResolvedValue(
      templateRow({ isActive: false }),
    );
    await expect(service.findById('tpl-1')).rejects.toBeInstanceOf(NotFoundException);

    prisma.documentTemplate.findUnique.mockResolvedValue(null);
    await expect(service.findByIdAdmin('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create trims slug and stores template', async () => {
    prisma.documentTemplate.create.mockResolvedValue(templateRow());

    const created = await service.create({
      slug: 'Cover-Letter',
      name: ' Cover Letter ',
      category: DocumentCategory.correspondence,
      htmlBody: VALID_HTML,
    });

    expect(created.id).toBe('tpl-1');
    expect(prisma.documentTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'cover-letter', name: 'Cover Letter' }),
      }),
    );
  });

  it('create throws ConflictException on duplicate slug', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('dup', {
      code: 'P2002',
      clientVersion: 'test',
    });
    prisma.documentTemplate.create.mockRejectedValue(err);

    await expect(
      service.create({
        slug: 'cover-letter',
        name: 'Cover Letter',
        category: DocumentCategory.correspondence,
        htmlBody: VALID_HTML,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('update / deactivate', async () => {
    prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
    prisma.documentTemplate.update.mockResolvedValue(
      templateRow({ name: 'Updated', isActive: false }),
    );

    await service.update('tpl-1', { name: 'Updated' });
    const deactivated = await service.deactivate('tpl-1');

    expect(deactivated.isActive).toBe(false);
    expect(prisma.documentTemplate.update).toHaveBeenCalled();
  });

  it('setDocxStorageKey / clearDocxStorageKey', async () => {
    prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
    prisma.documentTemplate.update
      .mockResolvedValueOnce(templateRow({ docxStorageKey: 'document-templates/tpl-1/template.docx' }))
      .mockResolvedValueOnce(templateRow({ docxStorageKey: null }));

    const withKey = await service.setDocxStorageKey('tpl-1', 'document-templates/tpl-1/template.docx');
    const cleared = await service.clearDocxStorageKey('tpl-1');

    expect(withKey.docxStorageKey).toContain('template.docx');
    expect(cleared.docxStorageKey).toBeNull();
  });

  it('uploadDocx stores file and updates template', async () => {
    prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
    prisma.documentTemplate.update.mockResolvedValue(
      templateRow({ docxStorageKey: 'document-templates/tpl-1/template.docx' }),
    );

    const file = {
      buffer: Buffer.from('docx'),
      size: 100,
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      originalname: 'template.docx',
    } as Express.Multer.File;

    const result = await service.uploadDocx('tpl-1', file);

    expect(storage.putObject).toHaveBeenCalled();
    expect(result.hasDocx).toBe(true);
  });

  it('deleteDocx removes storage object and clears key', async () => {
    prisma.documentTemplate.findUnique.mockResolvedValue(
      templateRow({ docxStorageKey: 'document-templates/tpl-1/template.docx' }),
    );
    prisma.documentTemplate.update.mockResolvedValue(templateRow({ docxStorageKey: null }));

    const result = await service.deleteDocx('tpl-1');

    expect(storage.deleteObject).toHaveBeenCalledWith(
      'document-templates/tpl-1/template.docx',
    );
    expect(result.hasDocx).toBe(false);
  });

  it('renderForMatter merges matter data into HTML', async () => {
    prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
    prisma.matter.findUnique.mockResolvedValue(matterRow());

    const html = await service.renderForMatter('tpl-1', 'm1');

    expect(html).toContain('Acme');
    expect(html).toContain('TM Matter');
  });

  it('renderDocxForMatter loads template buffer and renders docx', async () => {
    prisma.documentTemplate.findUnique.mockResolvedValue(
      templateRow({ docxStorageKey: 'document-templates/tpl-1/template.docx' }),
    );
    prisma.matter.findUnique.mockResolvedValue(matterRow());

    const buf = await service.renderDocxForMatter('tpl-1', 'm1');

    expect(storage.getObjectBuffer).toHaveBeenCalled();
    expect(docxTemplates.renderDocx).toHaveBeenCalled();
    expect(buf.toString()).toBe('rendered-docx');
  });

  it('renderDocxForMatter throws when no docx uploaded', async () => {
    prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());

    await expect(service.renderDocxForMatter('tpl-1', 'm1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('previewPdf renders sample merge data to PDF stream', async () => {
    prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());

    const file = await service.previewPdf({ id: 'tpl-1' });

    expect(pdfRenderer.renderHtmlToPdf).toHaveBeenCalled();
    expect(file).toBeDefined();
  });

  it('create rejects unknown merge fields', async () => {
    await expect(
      service.create({
        slug: 'bad',
        name: 'Bad',
        category: DocumentCategory.correspondence,
        htmlBody: '<p>{{unknownField}}</p>',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update validates merged fields when htmlBody changes', async () => {
    prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
    prisma.documentTemplate.update.mockResolvedValue(templateRow({ name: 'Updated' }));

    await service.update('tpl-1', { name: 'Updated' });
    expect(prisma.documentTemplate.update).toHaveBeenCalled();
  });

  it('renderForMatter throws when matter missing', async () => {
    prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
    prisma.matter.findUnique.mockResolvedValue(null);
    await expect(service.renderForMatter('tpl-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('previewPdf accepts inline htmlBody without template id', async () => {
    const file = await service.previewPdf({
      htmlBody: VALID_HTML,
      referenceLine: 'Ref: {{matterTitle}}',
    });
    expect(pdfRenderer.renderHtmlToPdf).toHaveBeenCalled();
    expect(file).toBeDefined();
  });

  it('previewPdf rejects empty htmlBody', async () => {
    await expect(service.previewPdf({ htmlBody: '   ' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('uploadDocx rejects non-docx files', async () => {
    prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
    const file = {
      buffer: Buffer.from('pdf'),
      size: 10,
      mimetype: 'application/pdf',
      originalname: 'template.pdf',
    } as Express.Multer.File;
    await expect(service.uploadDocx('tpl-1', file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deleteDocx skips storage delete when no key', async () => {
    prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
    prisma.documentTemplate.update.mockResolvedValue(templateRow({ docxStorageKey: null }));
    await service.deleteDocx('tpl-1');
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  describe('extended branch coverage', () => {
    it('create stores optional description and referenceLine', async () => {
      prisma.documentTemplate.create.mockResolvedValue(templateRow());
      await service.create({
        slug: 'notice',
        name: 'Notice',
        category: DocumentCategory.correspondence,
        htmlBody: VALID_HTML,
        description: 'Covers renewal notices',
        referenceLine: 'Ref: {{matterTitle}}',
      });
      expect(prisma.documentTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Covers renewal notices',
            referenceLine: 'Ref: {{matterTitle}}',
          }),
        }),
      );
    });

    it('update rejects unknown merge fields in htmlBody', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
      await expect(
        service.update('tpl-1', { htmlBody: '<p>{{notAField}}</p>' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('update rethrows non-duplicate prisma errors', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
      prisma.documentTemplate.update.mockRejectedValue(new Error('db down'));
      await expect(service.update('tpl-1', { name: 'X' })).rejects.toThrow(
        'db down',
      );
    });

    it('renderForMatter uses individual client name when company absent', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
      prisma.matter.findUnique.mockResolvedValue({
        ...matterRow(),
        client: {
          id: 'c1',
          companyName: null,
          firstName: 'Jane',
          lastName: 'Client',
          internalCode: 'CL-2',
          type: 'individual',
          offices: [{ city: 'Berlin', countryCode: 'DE' }],
        },
        ipRights: [],
      });

      const html = await service.renderForMatter('tpl-1', 'm1');
      expect(html).toContain('Jane Client');
    });

    it('previewPdf loads template by id when only id provided', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
      await service.previewPdf({ id: 'tpl-1' });
      expect(prisma.documentTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 'tpl-1' },
      });
    });

    it('uploadDocx rejects empty buffer', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
      const file = {
        buffer: Buffer.alloc(0),
        size: 0,
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        originalname: 'template.docx',
      } as Express.Multer.File;
      await expect(service.uploadDocx('tpl-1', file)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('listActive maps hasDocx from storage key', async () => {
      prisma.documentTemplate.findMany.mockResolvedValue([
        {
          id: 'tpl-1',
          slug: 'a',
          name: 'A',
          category: DocumentCategory.correspondence,
          description: null,
          docxStorageKey: 'key.docx',
        },
        {
          id: 'tpl-2',
          slug: 'b',
          name: 'B',
          category: DocumentCategory.correspondence,
          description: null,
          docxStorageKey: null,
        },
      ]);
      const rows = await service.listActive();
      expect(rows[0].hasDocx).toBe(true);
      expect(rows[1].hasDocx).toBe(false);
    });

    it('listAll includes inactive templates', async () => {
      prisma.documentTemplate.findMany.mockResolvedValue([
        {
          id: 'tpl-1',
          slug: 'a',
          name: 'A',
          category: DocumentCategory.correspondence,
          description: null,
          isActive: false,
          updatedAt: new Date(),
          createdAt: new Date(),
          docxStorageKey: null,
        },
      ]);
      const rows = await service.listAll();
      expect(rows[0].isActive).toBe(false);
    });

    it('create throws conflict on duplicate slug', async () => {
      const err = new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      });
      prisma.documentTemplate.create.mockRejectedValue(err);
      await expect(
        service.create({
          slug: 'dup',
          name: 'Dup',
          category: DocumentCategory.correspondence,
          htmlBody: VALID_HTML,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('findById rejects inactive template by default', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(
        templateRow({ isActive: false }),
      );
      await expect(service.findById('tpl-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('findById allows inactive when requireActive is false', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(
        templateRow({ isActive: false }),
      );
      await expect(
        service.findById('tpl-1', { requireActive: false }),
      ).resolves.toMatchObject({ id: 'tpl-1' });
    });

    it('renderDocxForMatter throws when template has no docx', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
      await expect(service.renderDocxForMatter('tpl-1', 'm1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('renderDocxForMatter renders stored docx with merge fields', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(
        templateRow({ docxStorageKey: 'templates/tpl-1.docx' }),
      );
      prisma.matter.findUnique.mockResolvedValue(matterRow());
      storage.getObjectBuffer.mockResolvedValue(Buffer.from('docx'));
      docxTemplates.renderDocx.mockResolvedValue(Buffer.from('out'));

      const buf = await service.renderDocxForMatter('tpl-1', 'm1');
      expect(buf.length).toBeGreaterThan(0);
      expect(docxTemplates.renderDocx).toHaveBeenCalled();
    });

    it('deactivate sets isActive false', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
      prisma.documentTemplate.update.mockResolvedValue(
        templateRow({ isActive: false }),
      );
      const row = await service.deactivate('tpl-1');
      expect(row.isActive).toBe(false);
    });

    it('deleteDocx removes storage object when key exists', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(
        templateRow({ docxStorageKey: 'templates/tpl-1.docx' }),
      );
      prisma.documentTemplate.update.mockResolvedValue(templateRow());
      await service.deleteDocx('tpl-1');
      expect(storage.deleteObject).toHaveBeenCalledWith('templates/tpl-1.docx');
    });

    it('uploadDocx accepts octet-stream mime for docx files', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
      storage.putObject.mockResolvedValue(undefined);
      prisma.documentTemplate.update.mockResolvedValue(
        templateRow({ docxStorageKey: 'document-templates/tpl-1/template.docx' }),
      );
      const file = {
        buffer: Buffer.from('docx-bytes'),
        size: 12,
        mimetype: 'application/octet-stream',
        originalname: 'template.docx',
      } as Express.Multer.File;
      const result = await service.uploadDocx('tpl-1', file);
      expect(result.hasDocx).toBe(true);
    });

    it('mergeFieldKeys returns allowed merge field list', () => {
      const keys = service.mergeFieldKeys();
      expect(keys).toContain('clientName');
      expect(keys).toContain('matterTitle');
    });

    it('findByIdAdmin throws when template missing', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(null);
      await expect(service.findByIdAdmin('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('update clears description when empty string provided', async () => {
      prisma.documentTemplate.findUnique.mockResolvedValue(templateRow());
      prisma.documentTemplate.update.mockResolvedValue(
        templateRow({ description: null }),
      );
      await service.update('tpl-1', { description: '  ' });
      expect(prisma.documentTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
    });
  });
});
