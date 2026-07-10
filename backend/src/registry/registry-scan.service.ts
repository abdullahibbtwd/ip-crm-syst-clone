import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  WatchAlertStatus,
  WatchProfileStatus,
  WatchRegistrySource,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { REGISTRY_SCAN_CONCURRENCY } from './registry.constants';
import { EpoProvider } from './providers/epo.provider';

export type RegistryScanResult = {
  success: boolean;
  profilesScanned: number;
  alertsCreated: number;
  errors: number;
  message?: string;
};

@Injectable()
export class RegistryScanService {
  private readonly logger = new Logger(RegistryScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly epo: EpoProvider,
  ) {}

  /** Nightly / full scan: all active profiles with EP jurisdiction. */
  async scanEpoWatchProfiles(): Promise<RegistryScanResult> {
    return this.runScan({ requireEpJurisdiction: true });
  }

  /** Manual scan for one client's active watch profiles against EPO. */
  async scanEpoForClient(clientId: string): Promise<RegistryScanResult> {
    if (!clientId?.trim()) {
      throw new BadRequestException('clientId is required');
    }
    return this.runScan({
      clientId: clientId.trim(),
      requireEpJurisdiction: false,
    });
  }

  private async runScan(options: {
    clientId?: string;
    requireEpJurisdiction: boolean;
  }): Promise<RegistryScanResult> {
    if (!this.epo.isConfigured()) {
      this.logger.warn('Skipping EPO watch scan — credentials not configured');
      return {
        success: false,
        profilesScanned: 0,
        alertsCreated: 0,
        errors: 0,
        message:
          'EPO is not configured. Set EPO_CONSUMER_KEY and EPO_CONSUMER_SECRET.',
      };
    }

    const profiles = await this.prisma.watchProfile.findMany({
      where: {
        status: WatchProfileStatus.active,
        ...(options.clientId ? { clientId: options.clientId } : {}),
        ...(options.requireEpJurisdiction
          ? { jurisdictions: { has: 'EP' } }
          : {}),
      },
      select: {
        id: true,
        clientId: true,
        markText: true,
        jurisdictions: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (profiles.length === 0) {
      return {
        success: true,
        profilesScanned: 0,
        alertsCreated: 0,
        errors: 0,
        message: options.clientId
          ? 'No active watch profiles for this client. Add a profile first.'
          : 'No active EP watch profiles to scan.',
      };
    }

    let alertsCreated = 0;
    let errors = 0;

    await mapPool(profiles, REGISTRY_SCAN_CONCURRENCY, async (profile) => {
      try {
        const hits = await this.epo.searchPublishedData(profile.markText);
        for (const hit of hits) {
          const applicationNumber = hit.publicationNumber;
          const existing = await this.prisma.watchAlert.findFirst({
            where: {
              watchProfileId: profile.id,
              applicationNumber,
              source: WatchRegistrySource.EPO,
            },
            select: { id: true },
          });
          if (existing) continue;

          const conflictingMark = hit.title?.trim() || applicationNumber;

          await this.prisma.watchAlert.create({
            data: {
              watchProfileId: profile.id,
              clientId: profile.clientId,
              conflictingMark,
              source: WatchRegistrySource.EPO,
              jurisdiction: profile.jurisdictions.includes('EP')
                ? 'EP'
                : (profile.jurisdictions[0] ?? 'EP'),
              applicationNumber,
              status: WatchAlertStatus.new,
            },
          });
          alertsCreated += 1;
        }
      } catch (err) {
        errors += 1;
        this.logger.warn(
          `EPO scan failed for profile ${profile.id} (${profile.markText}): ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    });

    this.logger.log(
      `EPO watch scan: ${profiles.length} profiles, ${alertsCreated} new alerts, ${errors} errors` +
        (options.clientId ? ` (client ${options.clientId})` : ''),
    );

    if (errors > 0 && alertsCreated === 0 && profiles.length > 0) {
      throw new ServiceUnavailableException(
        'EPO watch scan failed for all profiles. Check credentials or rate limits.',
      );
    }

    return {
      success: true,
      profilesScanned: profiles.length,
      alertsCreated,
      errors,
      message:
        alertsCreated > 0
          ? `Created ${alertsCreated} new EPO alert(s) from ${profiles.length} profile(s).`
          : `Scanned ${profiles.length} profile(s); no new EPO publications found (or already alerted).`,
    };
  }
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const runners = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
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
