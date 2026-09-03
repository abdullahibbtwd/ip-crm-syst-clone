import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PortalAccessService } from '../common/portal-access.service';
import { DocumentsController } from './documents.controller';
import { MatterDocumentsController } from './matter-documents.controller';
import { PortalDocumentsController } from './portal-documents.controller';
import { DocumentTemplatesController } from './document-templates.controller';
import type { DocumentsService } from './documents.service';
import type { DocumentTemplatesService } from './document-templates.service';

describe('Documents controllers', () => {
  const documentsService = {
    listFirmWide: jest.fn(),
    listVersions: jest.fn(),
    getDownloadUrl: jest.fn(),
    getFileContents: jest.fn(),
    uploadVersion: jest.fn(),
    listForMatter: jest.fn(),
    generateFromTemplate: jest.fn(),
    upload: jest.fn(),
    listForPortalClient: jest.fn(),
  };
  const portalAccess = {
    assertDocumentAccess: jest.fn().mockResolvedValue(undefined),
    assertMatterAccess: jest.fn().mockResolvedValue(undefined),
    requireScopeClientId: jest.fn().mockReturnValue('c1'),
  };
  const templates = {
    listActive: jest.fn(),
    listAll: jest.fn(),
    mergeFieldKeys: jest.fn().mockReturnValue(['client.name']),
    findByIdAdmin: jest.fn(),
    create: jest.fn(),
    previewPdf: jest.fn(),
    uploadDocx: jest.fn(),
    deleteDocx: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;
  const file = {
    originalname: 'a.pdf',
    buffer: Buffer.from('x'),
  } as Express.Multer.File;

  beforeEach(() => jest.clearAllMocks());

  it('DocumentsController', async () => {
    const c = new DocumentsController(
      documentsService as unknown as DocumentsService,
      portalAccess as unknown as PortalAccessService,
    );
    await c.listFirm({ search: 'a' } as never, 'm1');
    await c.listVersions('d1', req);
    await c.download('d1', req, 'v1');
    await c.uploadVersion('d1', file, req);

    expect(documentsService.listFirmWide).toHaveBeenCalledWith({
      search: 'a',
      matterId: 'm1',
    });
    expect(portalAccess.assertDocumentAccess).toHaveBeenCalledWith('d1', user);
    expect(documentsService.listVersions).toHaveBeenCalledWith('d1');
    expect(documentsService.getDownloadUrl).toHaveBeenCalledWith(
      'd1',
      'v1',
      undefined,
      undefined,
    );
    expect(documentsService.uploadVersion).toHaveBeenCalledWith(
      'd1',
      file,
      'u1',
    );
  });

  it('MatterDocumentsController', async () => {
    const c = new MatterDocumentsController(
      documentsService as unknown as DocumentsService,
      portalAccess as unknown as PortalAccessService,
    );
    await c.list('m1', {} as never, req);
    await c.generate('m1', { templateId: 't1', format: 'pdf' } as never, req);
    await c.upload('m1', file, { displayName: 'Doc' } as never, req);

    expect(portalAccess.assertMatterAccess).toHaveBeenCalledWith('m1', user);
    expect(documentsService.listForMatter).toHaveBeenCalledWith('m1', {});
    expect(documentsService.generateFromTemplate).toHaveBeenCalledWith(
      'm1',
      't1',
      'u1',
      'pdf',
      undefined,
    );
    expect(documentsService.upload).toHaveBeenCalledWith(
      'm1',
      file,
      { displayName: 'Doc' },
      'u1',
    );
  });

  it('PortalDocumentsController', async () => {
    const c = new PortalDocumentsController(
      documentsService as unknown as DocumentsService,
      portalAccess as unknown as PortalAccessService,
    );
    await c.list({} as never, req);
    expect(documentsService.listForPortalClient).toHaveBeenCalledWith('c1', {});
  });

  it('DocumentTemplatesController', async () => {
    const c = new DocumentTemplatesController(
      templates as unknown as DocumentTemplatesService,
    );
    await c.list();
    await c.listAdmin();
    expect(c.mergeFields()).toEqual({ fields: ['client.name'] });
    await c.findOne('t1');
    await c.create({ name: 'T' } as never);
    await c.preview({ htmlBody: '<p>x</p>' });
    await c.uploadDocx('t1', file);
    await c.deleteDocx('t1');
    await c.update('t1', { name: 'T2' } as never);
    await c.deactivate('t1');

    expect(templates.listActive).toHaveBeenCalled();
    expect(templates.listAll).toHaveBeenCalled();
    expect(templates.findByIdAdmin).toHaveBeenCalledWith('t1');
    expect(templates.create).toHaveBeenCalled();
    expect(templates.previewPdf).toHaveBeenCalled();
    expect(templates.uploadDocx).toHaveBeenCalledWith('t1', file);
    expect(templates.deleteDocx).toHaveBeenCalledWith('t1');
    expect(templates.update).toHaveBeenCalledWith('t1', { name: 'T2' });
    expect(templates.deactivate).toHaveBeenCalledWith('t1');
  });
});
