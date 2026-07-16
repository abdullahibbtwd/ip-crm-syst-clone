import { DelayedError, UnrecoverableError, type Job } from 'bullmq';
import { DocumentCategory } from '../../../generated/prisma/client';
import type { AuditService } from '../../audit/audit.service';
import type { CorrespondenceService } from '../../correspondence/correspondence.service';
import type { DocumentsService } from '../../documents/documents.service';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  EpoDocumentAuthError,
  EpoDocumentNotAvailableError,
} from '../epo-document.errors';
import type { EpoProvider } from '../providers/epo.provider';
import {
  EPO_DOCUMENT_FETCH_JOB,
} from '../registry.constants';
import { EpoDocumentProcessor } from './epo-document.processor';

describe('EpoDocumentProcessor', () => {
  let processor: EpoDocumentProcessor;
  let epo: {
    getDocument: jest.Mock;
    resolvePublicationNumber: jest.Mock;
  };
  let documents: { createFromBuffer: jest.Mock };
  let correspondence: {
    mergeMetadata: jest.Mock;
    linkAutoFetchedDocument: jest.Mock;
  };
  let prisma: {
    correspondence: { findUnique: jest.Mock };
    ipRight: { findUnique: jest.Mock; update: jest.Mock };
  };
  let audit: { log: jest.Mock };

  const jobData = {
    correspondenceId: 'corr-1',
    matterId: 'matter-1',
    ipRightId: 'ir-1',
    publicationNumber: 'EP3000000.A1',
    applicationNumber: 'EP237170531',
    actorUserId: 'user-1',
  };

  beforeEach(() => {
    epo = {
      getDocument: jest.fn(),
      resolvePublicationNumber: jest.fn(),
    };
    documents = {
      createFromBuffer: jest.fn().mockResolvedValue({
        id: 'doc-1',
        latestVersion: { id: 'ver-1' },
      }),
    };
    correspondence = {
      mergeMetadata: jest.fn().mockResolvedValue(undefined),
      linkAutoFetchedDocument: jest.fn().mockResolvedValue(undefined),
    };
    prisma = {
      correspondence: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'corr-1',
          documentVersionId: null,
          category: DocumentCategory.office_action,
          subject: 'EPO Office action',
          metadata: {},
        }),
      },
      ipRight: {
        findUnique: jest.fn().mockResolvedValue({ attributes: {} }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    processor = new EpoDocumentProcessor(
      epo as unknown as EpoProvider,
      documents as unknown as DocumentsService,
      correspondence as unknown as CorrespondenceService,
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  function makeJob(overrides: Partial<Job> = {}): Job {
    return {
      name: EPO_DOCUMENT_FETCH_JOB,
      data: jobData,
      attemptsMade: 0,
      opts: { attempts: 5 },
      moveToDelayed: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    } as unknown as Job;
  }

  it('ignores unexpected job names', async () => {
    await processor.process({ name: 'other', data: jobData } as Job);
    expect(epo.getDocument).not.toHaveBeenCalled();
  });

  it('throws UnrecoverableError when correspondence is missing', async () => {
    prisma.correspondence.findUnique.mockResolvedValue(null);
    await expect(processor.process(makeJob())).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
  });

  it('skips when correspondence already has a linked document', async () => {
    prisma.correspondence.findUnique.mockResolvedValue({
      id: 'corr-1',
      documentVersionId: 'existing-ver',
      category: DocumentCategory.office_action,
      subject: 'Done',
      metadata: {},
    });

    await expect(processor.process(makeJob())).resolves.toEqual({
      skipped: true,
      reason: 'already_linked',
    });
    expect(epo.getDocument).not.toHaveBeenCalled();
  });

  it('marks unavailable when publication number cannot be resolved', async () => {
    prisma.ipRight.findUnique.mockResolvedValue({
      attributes: {},
      applicationNumber: null,
      registrationNumber: null,
    });
    epo.resolvePublicationNumber.mockResolvedValue(null);

    await expect(
      processor.process({
        ...makeJob(),
        data: { ...jobData, publicationNumber: null },
      } as Job),
    ).rejects.toBeInstanceOf(UnrecoverableError);

    expect(correspondence.mergeMetadata).toHaveBeenCalledWith(
      'corr-1',
      expect.objectContaining({ epoDocumentFetchStatus: 'unavailable' }),
    );
  });

  it('fetches document, uploads, links, audits, and updates ip right', async () => {
    epo.getDocument.mockResolvedValue({
      buffer: Buffer.from('pdf'),
      mimeType: 'application/pdf',
      fileName: 'EPO-EP3000000.A1-fullimage.pdf',
      pageCount: 3,
      publicationNumber: 'EP3000000.A1',
      imagePath: 'published-data/.../fullimage',
    });

    const result = await processor.process(makeJob());

    expect(documents.createFromBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        matterId: 'matter-1',
        userId: 'user-1',
        category: DocumentCategory.office_action,
      }),
    );
    expect(correspondence.linkAutoFetchedDocument).toHaveBeenCalledWith(
      'corr-1',
      'ver-1',
      expect.objectContaining({ epoPublicationNumber: 'EP3000000.A1' }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'epo_document_auto_fetched' }),
    );
    expect(result).toMatchObject({
      correspondenceId: 'corr-1',
      documentVersionId: 'ver-1',
      pageCount: 3,
    });
  });

  it('resolves publication number from ip right attributes', async () => {
    prisma.correspondence.findUnique.mockResolvedValue({
      id: 'corr-1',
      documentVersionId: null,
      category: DocumentCategory.correspondence,
      subject: 'EPO',
      metadata: {},
    });
    epo.getDocument.mockResolvedValue({
      buffer: Buffer.from('pdf'),
      mimeType: 'application/pdf',
      fileName: 'doc.pdf',
      pageCount: 1,
      publicationNumber: 'EP111.A1',
      imagePath: 'path',
    });
    prisma.ipRight.findUnique.mockResolvedValue({
      attributes: { epoPublicationNumber: 'EP111.A1' },
      applicationNumber: null,
      registrationNumber: null,
    });

    await processor.process({
      ...makeJob(),
      data: { ...jobData, publicationNumber: null },
    } as Job);

    expect(epo.getDocument).toHaveBeenCalledWith('EP111.A1');
    expect(epo.resolvePublicationNumber).not.toHaveBeenCalled();
  });

  it('delays job when document is not yet available', async () => {
    epo.getDocument.mockRejectedValue(
      new EpoDocumentNotAvailableError('not published yet'),
    );
    const job = makeJob();
    const token = 'token-1';

    await expect(processor.process(job, token)).rejects.toBeInstanceOf(
      DelayedError,
    );
    expect(job.moveToDelayed).toHaveBeenCalledWith(
      expect.any(Number),
      token,
    );
    expect(correspondence.mergeMetadata).toHaveBeenCalledWith(
      'corr-1',
      expect.objectContaining({ epoDocumentFetchStatus: 'pending' }),
    );
  });

  it('marks unavailable after final not-available attempt', async () => {
    epo.getDocument.mockRejectedValue(
      new EpoDocumentNotAvailableError('still missing'),
    );
    const job = makeJob({ attemptsMade: 4, opts: { attempts: 5 } });

    await expect(processor.process(job)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(correspondence.mergeMetadata).toHaveBeenCalledWith(
      'corr-1',
      expect.objectContaining({ epoDocumentFetchStatus: 'unavailable' }),
    );
  });

  it('fails permanently on auth errors', async () => {
    epo.getDocument.mockRejectedValue(
      new EpoDocumentAuthError('forbidden', 403),
    );

    await expect(processor.process(makeJob())).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
    expect(correspondence.mergeMetadata).toHaveBeenCalledWith(
      'corr-1',
      expect.objectContaining({ epoDocumentFetchStatus: 'failed' }),
    );
  });

  it('rethrows unexpected errors after marking pending metadata', async () => {
    epo.getDocument.mockRejectedValue(new Error('network down'));

    await expect(processor.process(makeJob())).rejects.toThrow('network down');
    expect(correspondence.mergeMetadata).toHaveBeenCalledWith(
      'corr-1',
      expect.objectContaining({ epoDocumentFetchStatus: 'pending' }),
    );
  });
});
