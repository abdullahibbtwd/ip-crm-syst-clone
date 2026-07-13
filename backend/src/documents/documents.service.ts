import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentCategory, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PdfRendererService } from '../pdf/pdf-renderer.service';
import { MinioStorageService } from '../storage/minio-storage.service';
import {
  isAllowedUploadMime,
  MAX_UPLOAD_BYTES,
} from '../storage/storage.constants';
import { DocumentQueryDto, UploadDocumentDto } from './dto/document.dto';
import { DocumentTemplatesService } from './document-templates.service';

const userSelect = { id: true, fullName: true, email: true } as const;

const versionInclude = {
  uploadedBy: { select: userSelect },
} satisfies Prisma.MatterDocumentVersionInclude;

function parseTags(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return [
    ...new Set(
      raw
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

function buildStorageKey(
  matterId: string,
  documentId: string,
  version: number,
  fileName: string,
) {
  return `matters/${matterId}/${documentId}/v${version}/${sanitizeFileName(fileName)}`;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MinioStorageService,
    private readonly pdfRenderer: PdfRendererService,
    private readonly documentTemplates: DocumentTemplatesService,
  ) {}

  async listForMatter(matterId: string, query: DocumentQueryDto) {
    await this.assertMatterExists(matterId);
    const search = query.search?.trim();

    const documents = await this.prisma.matterDocument.findMany({
      where: {
        matterId,
        category: query.category,
        ...(search
          ? {
              OR: [
                { displayName: { contains: search, mode: 'insensitive' } },
                { tags: { has: search.toLowerCase() } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: { select: userSelect },
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: versionInclude,
        },
        _count: { select: { versions: true } },
      },
    });

    return documents.map((doc) => ({
      id: doc.id,
      matterId: doc.matterId,
      displayName: doc.displayName,
      category: doc.category,
      tags: doc.tags,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      createdBy: doc.createdBy,
      versionCount: doc._count.versions,
      latestVersion: doc.versions[0] ?? null,
    }));
  }

  async listFirmWide(query: DocumentQueryDto & { matterId?: string }) {
    const search = query.search?.trim();
    const documents = await this.prisma.matterDocument.findMany({
      where: {
        ...(query.matterId ? { matterId: query.matterId } : {}),
        category: query.category,
        ...(search
          ? {
              OR: [
                { displayName: { contains: search, mode: 'insensitive' } },
                { tags: { has: search.toLowerCase() } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        matter: {
          select: {
            id: true,
            title: true,
            client: {
              select: {
                id: true,
                companyName: true,
                firstName: true,
                lastName: true,
                internalCode: true,
              },
            },
          },
        },
        createdBy: { select: userSelect },
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: versionInclude,
        },
        _count: { select: { versions: true } },
      },
    });

    return documents.map((doc) => ({
      id: doc.id,
      matterId: doc.matterId,
      matterTitle: doc.matter.title,
      client: doc.matter.client,
      displayName: doc.displayName,
      category: doc.category,
      tags: doc.tags,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      createdBy: doc.createdBy,
      versionCount: doc._count.versions,
      latestVersion: doc.versions[0] ?? null,
    }));
  }

  async listForPortalClient(clientId: string, query: DocumentQueryDto & { matterId?: string }) {
    const search = query.search?.trim();

    const documents = await this.prisma.matterDocument.findMany({
      where: {
        matter: { clientId },
        ...(query.matterId ? { matterId: query.matterId } : {}),
        category: query.category,
        ...(search
          ? {
              OR: [
                { displayName: { contains: search, mode: 'insensitive' } },
                { tags: { has: search.toLowerCase() } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        matter: { select: { id: true, title: true } },
        createdBy: { select: userSelect },
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          include: versionInclude,
        },
        _count: { select: { versions: true } },
      },
    });

    return documents.map((doc) => ({
      id: doc.id,
      matterId: doc.matterId,
      matterTitle: doc.matter.title,
      displayName: doc.displayName,
      category: doc.category,
      tags: doc.tags,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      createdBy: doc.createdBy,
      versionCount: doc._count.versions,
      latestVersion: doc.versions[0] ?? null,
    }));
  }

  async upload(
    matterId: string,
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    userId: string,
  ) {
    await this.assertMatterExists(matterId);
    this.validateFile(file);

    const displayName = dto.displayName?.trim() || file.originalname;
    const tags = parseTags(dto.tags);

    return this.createFromBuffer({
      matterId,
      userId,
      displayName,
      category: dto.category,
      tags,
      fileName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });
  }

  /** Create a matter document from an in-memory buffer (system / EPO auto-fetch). */
  async createFromBuffer(input: {
    matterId: string;
    userId: string;
    displayName: string;
    category: DocumentCategory;
    tags: string[];
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }) {
    await this.assertMatterExists(input.matterId);

    if (input.buffer.length > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(
        `File exceeds maximum size of ${MAX_UPLOAD_BYTES} bytes`,
      );
    }
    if (!isAllowedUploadMime(input.mimeType, input.fileName)) {
      throw new BadRequestException(`MIME type not allowed: ${input.mimeType}`);
    }

    const document = await this.prisma.matterDocument.create({
      data: {
        matterId: input.matterId,
        displayName: input.displayName,
        category: input.category,
        tags: input.tags,
        createdById: input.userId,
      },
    });

    const storageKey = buildStorageKey(
      input.matterId,
      document.id,
      1,
      input.fileName,
    );

    try {
      await this.storage.putObject(storageKey, input.buffer, input.mimeType);
      const version = await this.prisma.matterDocumentVersion.create({
        data: {
          documentId: document.id,
          version: 1,
          fileName: input.fileName,
          mimeType: input.mimeType,
          sizeBytes: input.buffer.length,
          storageKey,
          uploadedById: input.userId,
        },
        include: versionInclude,
      });

      return {
        id: document.id,
        matterId: document.matterId,
        displayName: document.displayName,
        category: document.category,
        tags: document.tags,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        versionCount: 1,
        latestVersion: version,
      };
    } catch (err) {
      await this.prisma.matterDocument.delete({ where: { id: document.id } });
      throw err;
    }
  }

  async uploadVersion(
    documentId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    this.validateFile(file);

    const document = await this.prisma.matterDocument.findUnique({
      where: { id: documentId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!document) throw new NotFoundException('Document not found');

    const nextVersion = (document.versions[0]?.version ?? 0) + 1;
    const storageKey = buildStorageKey(
      document.matterId,
      document.id,
      nextVersion,
      file.originalname,
    );

    await this.storage.putObject(storageKey, file.buffer, file.mimetype);

    const version = await this.prisma.matterDocumentVersion.create({
      data: {
        documentId: document.id,
        version: nextVersion,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        uploadedById: userId,
      },
      include: versionInclude,
    });

    await this.prisma.matterDocument.update({
      where: { id: document.id },
      data: { updatedAt: new Date() },
    });

    return version;
  }

  async generateFromTemplate(
    matterId: string,
    templateId: string,
    userId: string,
    format: 'pdf' | 'docx' = 'pdf',
  ) {
    await this.assertMatterExists(matterId);
    const template = await this.documentTemplates.findById(templateId);

    const stamp = new Date().toISOString().slice(0, 10);
    const displayName = template.name;
    const tags = ['generated', template.slug];

    let fileName: string;
    let mimeType: string;
    let buffer: Buffer;

    if (format === 'docx') {
      if (!template.docxStorageKey) {
        throw new BadRequestException(
          'This template has no DOCX file. Upload a .docx template first.',
        );
      }
      buffer = await this.documentTemplates.renderDocxForMatter(
        templateId,
        matterId,
      );
      fileName = `${template.slug}-${stamp}.docx`;
      mimeType =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      const html = await this.documentTemplates.renderForMatter(
        templateId,
        matterId,
      );
      buffer = await this.pdfRenderer.renderHtmlToPdf(html);
      fileName = `${template.slug}-${stamp}.pdf`;
      mimeType = 'application/pdf';
    }

    const document = await this.prisma.matterDocument.create({
      data: {
        matterId,
        displayName,
        category: template.category,
        tags,
        createdById: userId,
      },
    });

    const storageKey = buildStorageKey(matterId, document.id, 1, fileName);

    try {
      await this.storage.putObject(storageKey, buffer, mimeType);
      const version = await this.prisma.matterDocumentVersion.create({
        data: {
          documentId: document.id,
          version: 1,
          fileName,
          mimeType,
          sizeBytes: buffer.length,
          storageKey,
          uploadedById: userId,
        },
        include: versionInclude,
      });

      return {
        id: document.id,
        matterId: document.matterId,
        displayName: document.displayName,
        category: document.category,
        tags: document.tags,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        versionCount: 1,
        latestVersion: version,
      };
    } catch (err) {
      await this.prisma.matterDocument.delete({ where: { id: document.id } });
      throw err;
    }
  }

  async listVersions(documentId: string) {
    const document = await this.prisma.matterDocument.findUnique({
      where: { id: documentId },
      select: { id: true },
    });
    if (!document) throw new NotFoundException('Document not found');

    return this.prisma.matterDocumentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
      include: versionInclude,
    });
  }

  async getDownloadUrl(documentId: string, versionId?: string) {
    const doc = await this.prisma.matterDocument.findUnique({
      where: { id: documentId },
      select: { matter: { select: { clientId: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const version = versionId
      ? await this.prisma.matterDocumentVersion.findFirst({
          where: { id: versionId, documentId },
        })
      : await this.prisma.matterDocumentVersion.findFirst({
          where: { documentId },
          orderBy: { version: 'desc' },
        });

    if (!version) throw new NotFoundException('Document version not found');

    const url = await this.storage.getPresignedDownloadUrl(version.storageKey);
    return {
      url,
      fileName: version.fileName,
      mimeType: version.mimeType,
      version: version.version,
      clientId: doc.matter.clientId,
    };
  }

  private validateFile(file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException('File exceeds maximum upload size (50 MB)');
    }
    if (!isAllowedUploadMime(file.mimetype, file.originalname)) {
      throw new BadRequestException(
        `File type not allowed: ${file.mimetype}. Use PDF, Word, Excel, email (.eml), or common images.`,
      );
    }
  }

  private async assertMatterExists(matterId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { id: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');
  }
}
