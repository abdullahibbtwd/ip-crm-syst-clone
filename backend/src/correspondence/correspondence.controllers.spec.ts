import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PortalAccessService } from '../common/portal-access.service';
import {
  CorrespondenceController,
  MatterCorrespondenceController,
  MatterTimelineController,
} from './correspondence.controller';
import { PortalCorrespondenceController } from './portal-correspondence.controller';
import type { CorrespondenceService } from './correspondence.service';
import type { EmlParserService } from './eml-parser.service';

describe('Correspondence controllers', () => {
  const correspondenceService = {
    listForMatter: jest.fn(),
    create: jest.fn(),
    listTimeline: jest.fn(),
    update: jest.fn(),
    listForPortalClient: jest.fn(),
    findOneForPortal: jest.fn(),
  };
  const portalAccess = {
    assertMatterAccess: jest.fn().mockResolvedValue(undefined),
    requireScopeClientId: jest.fn().mockReturnValue('c1'),
  };
  const emlParser = {
    parseBuffer: jest.fn(),
    parsePastedText: jest.fn(),
  };

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('MatterCorrespondenceController list / create / parse', async () => {
    const c = new MatterCorrespondenceController(
      correspondenceService as unknown as CorrespondenceService,
      portalAccess as unknown as PortalAccessService,
      emlParser as unknown as EmlParserService,
    );

    await c.list('m1', req);
    await c.create(
      'm1',
      { subject: 'Hi', sender: 'a', recipient: 'b' } as never,
      req,
    );
    await c.parseText('m1', { text: 'From: a' } as never, req);

    const file = {
      buffer: Buffer.from('eml'),
      mimetype: 'message/rfc822',
      originalname: 'mail.eml',
    } as Express.Multer.File;
    await c.parseEml('m1', file, req);

    expect(portalAccess.assertMatterAccess).toHaveBeenCalledWith('m1', user);
    expect(correspondenceService.listForMatter).toHaveBeenCalledWith('m1');
    expect(correspondenceService.create).toHaveBeenCalledWith(
      'm1',
      expect.any(Object),
      'u1',
    );
    expect(emlParser.parsePastedText).toHaveBeenCalledWith('From: a');
    expect(emlParser.parseBuffer).toHaveBeenCalledWith(file.buffer);
  });

  it('parseEml rejects missing / bad mime', async () => {
    const c = new MatterCorrespondenceController(
      correspondenceService as unknown as CorrespondenceService,
      portalAccess as unknown as PortalAccessService,
      emlParser as unknown as EmlParserService,
    );

    await expect(
      c.parseEml('m1', undefined as never, req),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      c.parseEml(
        'm1',
        {
          buffer: Buffer.from('x'),
          mimetype: 'application/zip',
          originalname: 'x.zip',
        } as Express.Multer.File,
        req,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('timeline / update / portal', async () => {
    const timeline = new MatterTimelineController(
      correspondenceService as unknown as CorrespondenceService,
      portalAccess as unknown as PortalAccessService,
    );
    const root = new CorrespondenceController(
      correspondenceService as unknown as CorrespondenceService,
    );
    const portal = new PortalCorrespondenceController(
      correspondenceService as unknown as CorrespondenceService,
      portalAccess as unknown as PortalAccessService,
    );

    await timeline.list('m1', req);
    await root.update('corr1', { subject: 'Updated' } as never);
    await portal.list(req);
    await portal.findOne('corr1', req);

    expect(correspondenceService.listTimeline).toHaveBeenCalledWith('m1');
    expect(correspondenceService.update).toHaveBeenCalledWith('corr1', {
      subject: 'Updated',
    });
    expect(correspondenceService.listForPortalClient).toHaveBeenCalledWith(
      'c1',
    );
    expect(correspondenceService.findOneForPortal).toHaveBeenCalledWith(
      'corr1',
      'c1',
    );
  });
});
