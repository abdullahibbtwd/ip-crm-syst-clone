import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, DelayedError, UnrecoverableError } from 'bullmq';
import { DocumentCategory, Prisma } from '../../../generated/prisma/client';
import { AuditService } from '../../audit/audit.service';
import { CorrespondenceService } from '../../correspondence/correspondence.service';
import { DocumentsService } from '../../documents/documents.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EpoDocumentAuthError,
  EpoDocumentNotAvailableError,
} from '../epo-document.errors';
import { EpoProvider } from '../providers/epo.provider';
import {
  EPO_DOCUMENT_FETCH_JOB,
  EPO_DOCUMENT_FETCH_QUEUE,
  EPO_DOCUMENT_NOT_AVAILABLE_DELAY_MS,
  REGISTRY_MODULE,
} from '../registry.constants';

export type EpoDocumentFetchJobData = {
  correspondenceId: string;
  matterId: string;
  ipRightId: string;
  publicationNumber?: string | null;
  applicationNumber?: string | null;
  actorUserId: string;
};

@Processor(EPO_DOCUMENT_FETCH_QUEUE, {
  concurrency: 1,
})
export class EpoDocumentProcessor extends WorkerHost {
  private readonly logger = new Logger(EpoDocumentProcessor.name);

  constructor(
    private readonly epo: EpoProvider,
    private readonly documents: DocumentsService,
    private readonly correspondence: CorrespondenceService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {
    super();
  }

  async process(job: Job<EpoDocumentFetchJobData>, token?: string) {
    if (job.name !== EPO_DOCUMENT_FETCH_JOB) return;

    const {
      correspondenceId,
      matterId,
      ipRightId,
      publicationNumber,
      applicationNumber,
      actorUserId,
    } = job.data;

    const row = await this.prisma.correspondence.findUnique({
      where: { id: correspondenceId },
      select: {
        id: true,
        documentVersionId: true,
        category: true,
        subject: true,
        metadata: true,
      },
    });

    if (!row) {
      throw new UnrecoverableError(
        `Correspondence ${correspondenceId} not found`,
      );
    }

    if (row.documentVersionId) {
      this.logger.log(
        `EPO document fetch skipped for ${correspondenceId}: already has document`,
      );
      return { skipped: true, reason: 'already_linked' };
    }

    const pubNumber =
      (publicationNumber?.trim() || null) ??
      (await this.resolvePublicationNumber(ipRightId, applicationNumber));

    if (!pubNumber) {
      await this.correspondence.mergeMetadata(correspondenceId, {
        epoDocumentFetchStatus: 'unavailable',
        epoDocumentFetchError: 'No publication number available for OPS images',
      });
      throw new UnrecoverableError(
        `No publication number for correspondence ${correspondenceId}`,
      );
    }

    try {
      const fetched = await this.epo.getDocument(pubNumber);
      const category =
        row.category === DocumentCategory.office_action ||
        row.category === DocumentCategory.certificate ||
        row.category === DocumentCategory.application ||
        row.category === DocumentCategory.evidence ||
        row.category === DocumentCategory.renewal ||
        row.category === DocumentCategory.correspondence
          ? row.category
          : DocumentCategory.office_action;

      const uploaded = await this.documents.createFromBuffer({
        matterId,
        userId: actorUserId,
        displayName:
          row.subject?.slice(0, 120) ||
          `EPO Official Document (${fetched.publicationNumber})`,
        category,
        tags: ['epo-auto-fetch', 'epo-original'],
        fileName: fetched.fileName,
        mimeType: fetched.mimeType,
        buffer: fetched.buffer,
      });

      const versionId = uploaded.latestVersion?.id;
      if (!versionId) {
        throw new Error('Document created without version');
      }

      await this.correspondence.linkAutoFetchedDocument(
        correspondenceId,
        versionId,
        {
          epoPublicationNumber: fetched.publicationNumber,
          epoDocumentImagePath: fetched.imagePath,
          epoDocumentPageCount: fetched.pageCount,
          epoDocumentFetchedAt: new Date().toISOString(),
        },
      );

      await this.prisma.ipRight.update({
        where: { id: ipRightId },
        data: {
          attributes: {
            ...((await this.loadIpRightAttrs(ipRightId)) ?? {}),
            epoPublicationNumber: fetched.publicationNumber,
          } as Prisma.InputJsonValue,
        },
      });

      await this.audit.log({
        userId: actorUserId,
        action: 'epo_document_auto_fetched',
        resource: 'correspondence',
        resourceId: correspondenceId,
        module: REGISTRY_MODULE,
        newValue: {
          documentId: uploaded.id,
          documentVersionId: versionId,
          publicationNumber: fetched.publicationNumber,
          pageCount: fetched.pageCount,
          matterId,
          ipRightId,
        },
      });

      this.logger.log(
        `EPO document linked to correspondence ${correspondenceId} (${fetched.pageCount} page(s), ${fetched.publicationNumber})`,
      );

      return {
        correspondenceId,
        documentVersionId: versionId,
        publicationNumber: fetched.publicationNumber,
        pageCount: fetched.pageCount,
      };
    } catch (err) {
      if (err instanceof EpoDocumentNotAvailableError) {
        await this.correspondence.mergeMetadata(correspondenceId, {
          epoDocumentFetchStatus: 'pending',
          epoDocumentFetchError: err.message,
          epoPublicationNumber: pubNumber,
        });

        const attempts = job.opts.attempts ?? 1;
        if (job.attemptsMade + 1 >= attempts) {
          await this.correspondence.mergeMetadata(correspondenceId, {
            epoDocumentFetchStatus: 'unavailable',
            epoDocumentFetchError: err.message,
          });
          throw new UnrecoverableError(err.message);
        }

        if (token) {
          await job.moveToDelayed(
            Date.now() + EPO_DOCUMENT_NOT_AVAILABLE_DELAY_MS,
            token,
          );
        }
        throw new DelayedError();
      }

      if (err instanceof EpoDocumentAuthError) {
        await this.correspondence.mergeMetadata(correspondenceId, {
          epoDocumentFetchStatus: 'failed',
          epoDocumentFetchError: err.message,
        });
        this.logger.error(
          `EPO document auth failure for ${correspondenceId}: ${err.message}`,
        );
        throw new UnrecoverableError(err.message);
      }

      await this.correspondence.mergeMetadata(correspondenceId, {
        epoDocumentFetchStatus: 'pending',
        epoDocumentFetchError:
          err instanceof Error ? err.message : 'EPO document fetch failed',
      });
      throw err;
    }
  }

  private async resolvePublicationNumber(
    ipRightId: string,
    applicationNumber?: string | null,
  ): Promise<string | null> {
    const right = await this.prisma.ipRight.findUnique({
      where: { id: ipRightId },
      select: {
        attributes: true,
        applicationNumber: true,
        registrationNumber: true,
      },
    });
    const attrs =
      right?.attributes &&
      typeof right.attributes === 'object' &&
      !Array.isArray(right.attributes)
        ? (right.attributes as Record<string, unknown>)
        : {};

    if (typeof attrs.epoPublicationNumber === 'string' && attrs.epoPublicationNumber) {
      return attrs.epoPublicationNumber;
    }

    const lookup =
      applicationNumber?.trim() ||
      right?.applicationNumber?.trim() ||
      right?.registrationNumber?.trim() ||
      null;
    if (!lookup) return null;

    return this.epo.resolvePublicationNumber(lookup);
  }

  private async loadIpRightAttrs(
    ipRightId: string,
  ): Promise<Record<string, unknown> | null> {
    const right = await this.prisma.ipRight.findUnique({
      where: { id: ipRightId },
      select: { attributes: true },
    });
    if (
      right?.attributes &&
      typeof right.attributes === 'object' &&
      !Array.isArray(right.attributes)
    ) {
      return right.attributes as Record<string, unknown>;
    }
    return {};
  }
}
