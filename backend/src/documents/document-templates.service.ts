import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PdfRendererService } from '../pdf/pdf-renderer.service';
import { PrismaService } from '../prisma/prisma.service';
import { MinioStorageService } from '../storage/minio-storage.service';
import { MAX_UPLOAD_BYTES } from '../storage/storage.constants';
import {
  applyMergeFields,
  buildDocumentMergeContext,
  DOCUMENT_MERGE_FIELD_KEYS,
  findUnknownMergeFields,
  sampleDocumentMergeContext,
} from './document-merge.util';
import { renderLetterDocument } from './document-template-renderer';
import { DocxTemplateService } from './docx-template.service';
import {
  CreateDocumentTemplateDto,
  UpdateDocumentTemplateDto,
} from './dto/document-template.dto';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function buildDocxTemplateStorageKey(templateId: string) {
  return `document-templates/${templateId}/template.docx`;
}

/** Plain-text merge (no HTML escaping) for DOCX / reference lines. */
function applyPlainMergeFields(
  template: string,
  fields: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => fields[key] ?? '');
}

@Injectable()
export class DocumentTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfRenderer: PdfRendererService,
    private readonly storage: MinioStorageService,
    private readonly docxTemplates: DocxTemplateService,
  ) {}

  listActive() {
    return this.prisma.documentTemplate
      .findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          slug: true,
          name: true,
          category: true,
          description: true,
          docxStorageKey: true,
        },
      })
      .then((rows) =>
        rows.map(({ docxStorageKey, ...rest }) => ({
          ...rest,
          hasDocx: Boolean(docxStorageKey),
        })),
      );
  }

  /** Admin list — includes inactive templates. */
  listAll() {
    return this.prisma.documentTemplate
      .findMany({
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          slug: true,
          name: true,
          category: true,
          description: true,
          isActive: true,
          updatedAt: true,
          createdAt: true,
          docxStorageKey: true,
        },
      })
      .then((rows) =>
        rows.map(({ docxStorageKey, ...rest }) => ({
          ...rest,
          hasDocx: Boolean(docxStorageKey),
        })),
      );
  }

  mergeFieldKeys() {
    return [...DOCUMENT_MERGE_FIELD_KEYS];
  }

  async findById(id: string, opts?: { requireActive?: boolean }) {
    const requireActive = opts?.requireActive !== false;
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });
    if (!template || (requireActive && !template.isActive)) {
      throw new NotFoundException('Document template not found');
    }
    return template;
  }

  async findByIdAdmin(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Document template not found');
    return template;
  }

  async create(dto: CreateDocumentTemplateDto) {
    this.assertMergeFields(dto.htmlBody, dto.referenceLine);
    try {
      return await this.prisma.documentTemplate.create({
        data: {
          slug: dto.slug.trim().toLowerCase(),
          name: dto.name.trim(),
          category: dto.category,
          description: dto.description?.trim() || null,
          referenceLine: dto.referenceLine?.trim() || null,
          htmlBody: dto.htmlBody,
          isActive: true,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('A template with this slug already exists');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateDocumentTemplateDto) {
    await this.findByIdAdmin(id);
    if (dto.htmlBody != null || dto.referenceLine !== undefined) {
      const existing = await this.findByIdAdmin(id);
      this.assertMergeFields(
        dto.htmlBody ?? existing.htmlBody,
        dto.referenceLine === undefined
          ? existing.referenceLine
          : dto.referenceLine,
      );
    }
    return this.prisma.documentTemplate.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        category: dto.category,
        description:
          dto.description === undefined
            ? undefined
            : dto.description?.trim() || null,
        referenceLine:
          dto.referenceLine === undefined
            ? undefined
            : dto.referenceLine?.trim() || null,
        htmlBody: dto.htmlBody,
        isActive: dto.isActive,
      },
    });
  }

  async deactivate(id: string) {
    await this.findByIdAdmin(id);
    return this.prisma.documentTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async setDocxStorageKey(templateId: string, storageKey: string) {
    await this.findByIdAdmin(templateId);
    return this.prisma.documentTemplate.update({
      where: { id: templateId },
      data: { docxStorageKey: storageKey },
    });
  }

  async clearDocxStorageKey(templateId: string) {
    await this.findByIdAdmin(templateId);
    return this.prisma.documentTemplate.update({
      where: { id: templateId },
      data: { docxStorageKey: null },
    });
  }

  async uploadDocx(templateId: string, file: Express.Multer.File) {
    await this.findByIdAdmin(templateId);
    this.validateDocxFile(file);

    const storageKey = buildDocxTemplateStorageKey(templateId);
    await this.storage.putObject(
      storageKey,
      file.buffer,
      file.mimetype || DOCX_MIME,
    );
    const updated = await this.setDocxStorageKey(templateId, storageKey);
    return {
      id: updated.id,
      docxStorageKey: updated.docxStorageKey,
      hasDocx: true,
    };
  }

  async deleteDocx(templateId: string) {
    const template = await this.findByIdAdmin(templateId);
    if (template.docxStorageKey) {
      await this.storage.deleteObject(template.docxStorageKey);
    }
    const updated = await this.clearDocxStorageKey(templateId);
    return {
      id: updated.id,
      docxStorageKey: null,
      hasDocx: false,
    };
  }

  async renderForMatter(templateId: string, matterId: string): Promise<string> {
    const template = await this.findById(templateId);

    const matter = await this.loadMatterForMerge(matterId);
    const fields = buildDocumentMergeContext(matter);

    return renderLetterDocument({
      referenceLine: template.referenceLine ?? '',
      htmlBody: template.htmlBody,
      fields,
    });
  }

  async renderDocxForMatter(
    templateId: string,
    matterId: string,
  ): Promise<Buffer> {
    const template = await this.findById(templateId);
    if (!template.docxStorageKey) {
      throw new BadRequestException(
        'This template has no DOCX file. Upload a .docx template first.',
      );
    }

    const matter = await this.loadMatterForMerge(matterId);
    const fields = buildDocumentMergeContext(matter);
    if (template.referenceLine) {
      fields.referenceLine = applyPlainMergeFields(
        template.referenceLine,
        fields,
      );
    }

    const templateBuffer = await this.storage.getObjectBuffer(
      template.docxStorageKey,
    );
    return this.docxTemplates.renderDocx(templateBuffer, fields);
  }

  /** Preview PDF with sample merge data (admin safety rail). */
  async previewPdf(
    input: { id?: string; htmlBody?: string; referenceLine?: string | null },
  ): Promise<StreamableFile> {
    let htmlBody = input.htmlBody;
    let referenceLine = input.referenceLine ?? '';

    if (input.id) {
      const template = await this.findByIdAdmin(input.id);
      htmlBody = htmlBody ?? template.htmlBody;
      if (input.referenceLine === undefined) {
        referenceLine = template.referenceLine ?? '';
      }
    }

    if (!htmlBody?.trim()) {
      throw new BadRequestException('htmlBody is required for preview');
    }

    this.assertMergeFields(htmlBody, referenceLine);

    const fields = sampleDocumentMergeContext();
    if (referenceLine) {
      fields.referenceLine = applyMergeFields(referenceLine, fields);
    }

    const html = renderLetterDocument({
      referenceLine: referenceLine || fields.referenceLine,
      htmlBody,
      fields,
    });

    const pdf = await this.pdfRenderer.renderHtmlToPdf(html);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: 'inline; filename="template-preview.pdf"',
    });
  }

  private async loadMatterForMerge(matterId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      include: {
        client: {
          include: {
            offices: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
          },
        },
        assignedTo: { select: { fullName: true, email: true } },
        jurisdictions: { orderBy: { countryCode: 'asc' } },
        ipRights: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!matter) throw new NotFoundException('Matter not found');
    return matter;
  }

  private validateDocxFile(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('File exceeds maximum upload size (50 MB)');
    }
    const name = file.originalname?.toLowerCase() ?? '';
    const mimeOk =
      !file.mimetype ||
      file.mimetype === DOCX_MIME ||
      file.mimetype === 'application/octet-stream';
    if (!name.endsWith('.docx') || !mimeOk) {
      throw new BadRequestException('Only .docx files are allowed');
    }
  }

  private assertMergeFields(
    htmlBody: string,
    referenceLine?: string | null,
  ) {
    const unknown = [
      ...findUnknownMergeFields(htmlBody),
      ...findUnknownMergeFields(referenceLine ?? ''),
    ];
    const unique = [...new Set(unknown)];
    if (unique.length > 0) {
      throw new BadRequestException(
        `Unknown merge fields: ${unique.map((k) => `{{${k}}}`).join(', ')}. ` +
          `Allowed: ${DOCUMENT_MERGE_FIELD_KEYS.map((k) => `{{${k}}}`).join(', ')}`,
      );
    }
  }
}
