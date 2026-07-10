import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  CorrespondenceDirection,
  CorrespondenceSource,
  CorrespondenceStatus,
  DocumentCategory,
  IpRightStatus,
  Prisma,
} from '../../generated/prisma/client';
import { CorrespondenceService } from '../correspondence/correspondence.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  EpoApplicationRef,
  RegistryLegalEvent,
} from './interfaces/registry-connector.interface';
import { EpoProvider } from './providers/epo.provider';
import { EPO_STATUS_SCAN_CONCURRENCY } from './registry.constants';
import {
  epoRegisterUrl,
  epoRegisterUrlFromParts,
  normalizeEpoAppNumber,
} from './epo-register.util';

export type EpoStatusCheckResult = {
  success: boolean;
  ipRightId: string;
  applicationNumber: string | null;
  eventsFound: number;
  newEvents: number;
  correspondenceCreated: number;
  message: string;
};

type IpRightAttributes = {
  epoLastChecked?: string;
  epoLastEventId?: string;
  epoSeenEventIds?: string[];
  [key: string]: unknown;
};

@Injectable()
export class EpoStatusService {
  private readonly logger = new Logger(EpoStatusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly epo: EpoProvider,
    private readonly correspondence: CorrespondenceService,
    private readonly notifications: NotificationDispatchService,
  ) {}

  async scanAllActiveEpRights(): Promise<{
    rightsScanned: number;
    correspondenceCreated: number;
    errors: number;
  }> {
    if (!this.epo.isConfigured()) {
      this.logger.warn('Skipping EPO status scan — credentials not configured');
      return { rightsScanned: 0, correspondenceCreated: 0, errors: 0 };
    }

    const rights = await this.prisma.ipRight.findMany({
      where: {
        jurisdiction: 'EP',
        status: { in: [IpRightStatus.filed, IpRightStatus.registered] },
        applicationNumber: { not: null },
      },
      select: { id: true },
      orderBy: { updatedAt: 'asc' },
    });

    let correspondenceCreated = 0;
    let errors = 0;

    await mapPool(rights, EPO_STATUS_SCAN_CONCURRENCY, async (right) => {
      try {
        const result = await this.checkIpRight(right.id);
        correspondenceCreated += result.correspondenceCreated;
      } catch (err) {
        errors += 1;
        this.logger.warn(
          `EPO status scan failed for ipRight ${right.id}: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    });

    this.logger.log(
      `EPO status scan: ${rights.length} rights, ${correspondenceCreated} correspondence, ${errors} errors`,
    );

    return {
      rightsScanned: rights.length,
      correspondenceCreated,
      errors,
    };
  }

  async checkIpRight(
    ipRightId: string,
    actorUserId?: string,
  ): Promise<EpoStatusCheckResult> {
    if (!this.epo.isConfigured()) {
      throw new ServiceUnavailableException(
        'EPO is not configured. Set EPO_CONSUMER_KEY and EPO_CONSUMER_SECRET.',
      );
    }

    const right = await this.prisma.ipRight.findUnique({
      where: { id: ipRightId },
      include: {
        matter: {
          select: {
            id: true,
            assignedToId: true,
            filedById: true,
            title: true,
            assignedTo: { select: { id: true, email: true, fullName: true } },
          },
        },
      },
    });

    if (!right) {
      throw new NotFoundException('IP right not found');
    }

    const jurisdiction = right.jurisdiction.trim().toUpperCase();
    if (jurisdiction !== 'EP' && jurisdiction !== 'EPO') {
      return {
        success: false,
        ipRightId: right.id,
        applicationNumber: right.applicationNumber,
        eventsFound: 0,
        newEvents: 0,
        correspondenceCreated: 0,
        message: 'EPO status check only applies to jurisdiction EP.',
      };
    }

    const lookupNumber =
      right.applicationNumber?.trim() || right.registrationNumber?.trim() || null;

    if (!lookupNumber) {
      return {
        success: false,
        ipRightId: right.id,
        applicationNumber: null,
        eventsFound: 0,
        newEvents: 0,
        correspondenceCreated: 0,
        message: 'IP right has no application number.',
      };
    }

    if (
      right.status !== IpRightStatus.filed &&
      right.status !== IpRightStatus.registered
    ) {
      return {
        success: false,
        ipRightId: right.id,
        applicationNumber: right.applicationNumber,
        eventsFound: 0,
        newEvents: 0,
        correspondenceCreated: 0,
        message: `IP right status is ${right.status}; only filed/registered cases are monitored.`,
      };
    }

    const legal = await this.epo.getLegalStatus(lookupNumber);
    const attrs = (right.attributes ?? {}) as IpRightAttributes;
    const seen = new Set(attrs.epoSeenEventIds ?? []);

    // Actionable prosecution events only (OA / grant / refusal)
    const actionable = legal.events.filter((e) => e.kind !== 'other');
    const newEvents = actionable.filter((e) => !seen.has(e.eventId));

    this.logger.log(
      `EPO status ${lookupNumber}: parsed=${legal.events.length} actionable=${actionable.length} new=${newEvents.length} seen=${seen.size}`,
    );
    if (legal.events.length > 0) {
      this.logger.debug(
        `EPO status sample events: ${JSON.stringify(legal.events.slice(0, 5))}`,
      );
    }
    if (actionable.length === 0 && legal.events.length > 0) {
      this.logger.warn(
        `EPO status ${lookupNumber}: ${legal.events.length} event(s) parsed but none actionable (kinds: ${legal.events
          .map((e) => `${e.code}:${e.kind}`)
          .join(', ')
          .slice(0, 500)})`,
      );
    }

    const actorId =
      actorUserId ??
      right.matter.assignedToId ??
      right.matter.filedById ??
      (await this.resolveFallbackUserId());

    let correspondenceCreated = 0;

    for (const event of newEvents) {
      await this.createEventCorrespondence(right.matterId, event, actorId, {
        ipRightId: right.id,
        applicationNumber: lookupNumber,
        applicationRef: legal.applicationRef ?? null,
      });
      seen.add(event.eventId);
      correspondenceCreated += 1;
    }

    const lastEventId =
      newEvents[newEvents.length - 1]?.eventId ??
      attrs.epoLastEventId ??
      actionable[actionable.length - 1]?.eventId ??
      null;

    const nextAttrs: IpRightAttributes = {
      ...attrs,
      epoLastChecked: new Date().toISOString().slice(0, 10),
      epoSeenEventIds: [...seen].slice(-200),
      ...(lastEventId ? { epoLastEventId: lastEventId } : {}),
      ...(legal.applicationRef
        ? {
            epoAppNumber: legal.applicationRef.fullAppNumber,
            epoBaseNumber: legal.applicationRef.baseNumber,
            epoCheckDigit: legal.applicationRef.checkDigit,
            epoEpodoc: legal.applicationRef.epodoc,
            epoRegisterLink: epoRegisterUrlFromParts(
              legal.applicationRef.baseNumber,
              legal.applicationRef.checkDigit,
            ),
          }
        : {}),
    };

    // Persist application number if it was only stored as registration number
    const shouldBackfillAppNo =
      !right.applicationNumber?.trim() && Boolean(lookupNumber);

    await this.prisma.ipRight.update({
      where: { id: right.id },
      data: {
        attributes: nextAttrs as Prisma.InputJsonValue,
        ...(shouldBackfillAppNo ? { applicationNumber: lookupNumber } : {}),
      },
    });

    if (correspondenceCreated > 0 && right.matter.assignedToId) {
      const assignee = right.matter.assignedTo;
      if (assignee) {
        await this.notifications.dispatch({
          userId: assignee.id,
          type: 'general',
          title: `EPO status update: ${lookupNumber}`,
          body: `${correspondenceCreated} new prosecution event(s) added to correspondence for ${right.matter.title}.`,
          resource: 'matter',
          resourceId: right.matterId,
          linkUrl: `/matters/${right.matterId}/correspondence`,
          emailTo: assignee.email,
          emailSubject: `EPO update — ${lookupNumber}`,
          metadata: {
            ipRightId: right.id,
            applicationNumber: lookupNumber,
            correspondenceCreated,
          },
        });
      }
    }

    const message =
      correspondenceCreated > 0
        ? `Found ${correspondenceCreated} new EPO event(s) and added them to Correspondence.`
        : actionable.length === 0
          ? 'No actionable EPO legal events found for this application.'
          : 'No new EPO events since last check.';

    return {
      success: true,
      ipRightId: right.id,
      applicationNumber: lookupNumber,
      eventsFound: legal.events.length,
      newEvents: newEvents.length,
      correspondenceCreated,
      message,
    };
  }

  private async createEventCorrespondence(
    matterId: string,
    event: RegistryLegalEvent,
    userId: string,
    meta: {
      ipRightId: string;
      applicationNumber: string;
      applicationRef?: EpoApplicationRef | null;
    },
  ) {
    const category =
      event.kind === 'grant'
        ? DocumentCategory.certificate
        : event.kind === 'office_action' || event.kind === 'refusal'
          ? DocumentCategory.office_action
          : DocumentCategory.correspondence;

    const kindLabel =
      event.kind === 'grant'
        ? 'Grant'
        : event.kind === 'refusal'
          ? 'Refusal'
          : event.kind === 'office_action'
            ? 'Office action'
            : 'Legal event';

    const subject = [
      `EPO ${kindLabel}`,
      event.code !== 'UNK' ? `(${event.code})` : null,
      event.description?.slice(0, 120) || null,
    ]
      .filter(Boolean)
      .join(' — ');

    const dateIso = event.date ?? new Date().toISOString().slice(0, 10);
    const appRef = meta.applicationRef;
    const registerParts = resolveEpoRegisterParts(
      appRef,
      meta.applicationNumber,
    );

    await this.correspondence.create(
      matterId,
      {
        direction: CorrespondenceDirection.incoming,
        category,
        correspondenceDate: dateIso,
        sender: 'EPO',
        recipient: 'IP Consulting',
        subject,
        status: CorrespondenceStatus.received,
        source: CorrespondenceSource.manual,
        bodyText: [
          `EPO legal status event imported automatically.`,
          `Application: ${registerParts.epodoc}`,
          appRef
            ? `Register number: EP${appRef.baseNumber}.${appRef.checkDigit}`
            : null,
          `Code: ${event.code}`,
          `Date: ${event.date ?? 'unknown'}`,
          `Kind: ${event.kind}`,
          event.description ? `Description: ${event.description}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        metadata: {
          source: 'epo_ops',
          epoEventId: event.eventId,
          epoEventCode: event.code,
          epoEventKind: event.kind,
          epoEventDescription: event.description,
          epoAppNumber: registerParts.fullAppNumber,
          epoBaseNumber: registerParts.baseNumber,
          epoCheckDigit: registerParts.checkDigit,
          epoEpodoc: registerParts.epodoc,
          ipRightId: meta.ipRightId,
          applicationNumber: meta.applicationNumber,
          epoRegisterLink: registerParts.registerLink,
        },
      },
      userId,
    );
  }

  private async resolveFallbackUserId(): Promise<string> {
    const admin = await this.prisma.user.findFirst({
      where: {
        isActive: true,
        userRoles: { some: { role: { name: 'managing_partner' } } },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!admin) {
      throw new ServiceUnavailableException(
        'No managing partner user available to attribute EPO correspondence',
      );
    }
    return admin.id;
  }
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const runners = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length || 1)) },
    async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item === undefined) return;
        await worker(item);
      }
    },
  );
  await Promise.allSettled(runners);
}

function resolveEpoRegisterParts(
  appRef: EpoApplicationRef | null | undefined,
  fallbackPublicationOrApp: string,
): {
  baseNumber: string | null;
  checkDigit: string | null;
  fullAppNumber: string;
  epodoc: string;
  registerLink: string;
} {
  if (appRef?.fullAppNumber && appRef.checkDigit) {
    return {
      baseNumber: appRef.baseNumber,
      checkDigit: appRef.checkDigit,
      fullAppNumber: appRef.fullAppNumber,
      epodoc: appRef.epodoc,
      registerLink: epoRegisterUrlFromParts(appRef.baseNumber, appRef.checkDigit),
    };
  }

  const normalized = normalizeEpoAppNumber(fallbackPublicationOrApp);
  const digits = normalized.replace(/^EP/i, '');
  return {
    baseNumber: null,
    checkDigit: null,
    fullAppNumber: digits,
    epodoc: normalized.startsWith('EP') ? normalized : `EP${digits}`,
    registerLink: epoRegisterUrl(normalized),
  };
}
