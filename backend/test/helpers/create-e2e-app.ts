import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { SsoService } from '../../src/auth/sso.service';
import { EmailSyncSchedulerService } from '../../src/email-integration/email-sync-scheduler.service';
import { DeadlineSchedulerService } from '../../src/notifications/deadline-scheduler.service';
import { EpoStatusSchedulerService } from '../../src/registry/epo-status-scheduler.service';
import { EpoProvider } from '../../src/registry/providers/epo.provider';
import { RegistryScanSchedulerService } from '../../src/registry/registry-scan-scheduler.service';
import { RetentionSchedulerService } from '../../src/retention/retention-scheduler.service';
import { MinioStorageService } from '../../src/storage/minio-storage.service';
import { PdfRendererService } from '../../src/pdf/pdf-renderer.service';

/** Load root/.env then backend/.env before Prisma reads DATABASE_URL. */
function bootstrapE2eEnv(): void {
  loadEnv({ path: resolve(process.cwd(), '../.env') });
  loadEnv({ path: resolve(process.cwd(), '.env') });

  process.env.NODE_ENV = 'test';
  process.env.DEADLINE_SCAN_ON_STARTUP = 'false';
  process.env.RETENTION_SCAN_ON_STARTUP = 'false';
  process.env.REGISTRY_SCAN_ON_STARTUP = 'false';
  process.env.EPO_WATCH_SCAN_ON_STARTUP = 'false';
  process.env.EPO_STATUS_SCAN_ON_STARTUP = 'false';

  // Optional override when DATABASE_URL's host port differs (e.g. conflict).
  // Default is whatever is in .env (typically 5433).
  const e2ePort = process.env.E2E_POSTGRES_PORT;
  if (e2ePort && process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
      /(@[^:/]+):(\d+)\//,
      `$1:${e2ePort}/`,
    );
  }
}

bootstrapE2eEnv();

const noopScheduler = { onModuleInit: async () => undefined };

/** Stub MinIO so e2e can boot without object storage. */
const minioStub: Partial<MinioStorageService> = {
  onModuleInit: async () => undefined,
  checkHealth: async () => ({ ok: true, latencyMs: 0 }),
  putObject: async () => undefined,
  deleteObject: async () => undefined,
  getObjectBuffer: async () => Buffer.from(''),
  getPresignedDownloadUrl: async () => 'https://example.test/object',
};

const ssoStub: Partial<SsoService> = {
  onModuleInit: async () => undefined,
  refreshCredentials: async () => undefined,
};

const epoStub: Partial<EpoProvider> = {
  onModuleInit: async () => undefined,
  refreshCredentials: async () => undefined,
};

const pdfStub: Partial<PdfRendererService> = {
  onModuleInit: async () => undefined,
  onModuleDestroy: async () => undefined,
};

export async function createE2eApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MinioStorageService)
    .useValue(minioStub)
    .overrideProvider(SsoService)
    .useValue(ssoStub)
    .overrideProvider(EpoProvider)
    .useValue(epoStub)
    .overrideProvider(PdfRendererService)
    .useValue(pdfStub)
    .overrideProvider(DeadlineSchedulerService)
    .useValue(noopScheduler)
    .overrideProvider(RetentionSchedulerService)
    .useValue(noopScheduler)
    .overrideProvider(RegistryScanSchedulerService)
    .useValue(noopScheduler)
    .overrideProvider(EpoStatusSchedulerService)
    .useValue(noopScheduler)
    .overrideProvider(EmailSyncSchedulerService)
    .useValue(noopScheduler)
    .compile();

  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}
