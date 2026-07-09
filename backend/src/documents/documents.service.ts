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

    const document = await this.prisma.matterDocument.create({
      data: {
        matterId,
        displayName,
        category: dto.category,
        tags,
        createdById: userId,
      },
    });

    const storageKey = buildStorageKey(matterId, document.id, 1, file.originalname);

    try {
      await this.storage.putObject(storageKey, file.buffer, file.mimetype);
      const version = await this.prisma.matterDocumentVersion.create({
        data: {
          documentId: document.id,
          version: 1,
          fileName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
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
  ) {
    await this.assertMatterExists(matterId);
    const template = await this.documentTemplates.findById(templateId);
    const html = await this.documentTemplates.renderForMatter(templateId, matterId);
    const pdfBuffer = await this.pdfRenderer.renderHtmlToPdf(html);

    const stamp = new Date().toISOString().slice(0, 10);
    const fileName = `${template.slug}-${stamp}.pdf`;
    const displayName = template.name;
    const tags = ['generated', template.slug];

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
      await this.storage.putObject(storageKey, pdfBuffer, 'application/pdf');
      const version = await this.prisma.matterDocumentVersion.create({
        data: {
          documentId: document.id,
          version: 1,
          fileName,
          mimeType: 'application/pdf',
          sizeBytes: pdfBuffer.length,
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
