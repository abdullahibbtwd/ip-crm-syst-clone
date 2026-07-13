import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketLifecycleConfigurationCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Staging mailbox `.eml` prefix — keep in sync with email-sync ingest keys. */
const MAILBOX_STAGING_PREFIX = 'mailbox/';
const DEFAULT_MAILBOX_STAGING_RETENTION_DAYS = 30;

@Injectable()
export class MinioStorageService implements OnModuleInit {
  private readonly logger = new Logger(MinioStorageService.name);
  private client!: S3Client;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.config.get<string>('MINIO_PORT', '9000');
    const useSsl = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.config.get<string>('MINIO_ACCESS_KEY', 'crm_minio');
    const secretKey = this.config.get<string>('MINIO_SECRET_KEY', 'crm_minio_secret');
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'ip-crm-documents');

    const protocol = useSsl ? 'https' : 'http';
    this.client = new S3Client({
      region: this.config.get<string>('MINIO_REGION', 'us-east-1'),
      endpoint: `${protocol}://${endpoint}:${port}`,
      forcePathStyle: true,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });

    await this.ensureBucket();
    await this.ensureMailboxStagingLifecycle();
  }

  private async ensureBucket() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created MinIO bucket: ${this.bucket}`);
      } catch (err) {
        this.logger.warn(
          `MinIO bucket check failed (is MinIO running on port ${this.config.get('MINIO_PORT', '9000')}?): ${err}`,
        );
      }
    }
  }

  /**
   * Auto-delete staging mailbox `.eml` objects under `mailbox/` after N days.
   * Matter document copies under `matters/` are unaffected.
   */
  private async ensureMailboxStagingLifecycle() {
    const days = Number(
      this.config.get(
        'MAILBOX_STAGING_RETENTION_DAYS',
        String(DEFAULT_MAILBOX_STAGING_RETENTION_DAYS),
      ),
    );
    if (!Number.isFinite(days) || days <= 0) {
      this.logger.log('Mailbox staging lifecycle disabled (retention days <= 0)');
      return;
    }

    try {
      await this.client.send(
        new PutBucketLifecycleConfigurationCommand({
          Bucket: this.bucket,
          LifecycleConfiguration: {
            Rules: [
              {
                ID: 'mailbox-staging-expire',
                Status: 'Enabled',
                Filter: { Prefix: MAILBOX_STAGING_PREFIX },
                Expiration: { Days: days },
              },
            ],
          },
        }),
      );
      this.logger.log(
        `MinIO lifecycle: expire ${MAILBOX_STAGING_PREFIX}* after ${days} days`,
      );
    } catch (err) {
      this.logger.warn(
        `Could not set MinIO mailbox lifecycle (bucket may be offline): ${err}`,
      );
    }
  }

  async putObject(key: string, body: Buffer, mimeType?: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
      }),
    );
  }

  async deleteObject(key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getPresignedDownloadUrl(key: string, expiresInSeconds = 3600) {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async getObjectBuffer(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!response.Body) {
      throw new Error(`Object not found: ${key}`);
    }
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /** Lightweight readiness probe for system health. */
  async checkHealth(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const started = Date.now();
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return { ok: true, latencyMs: Date.now() - started };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : 'MinIO unreachable',
      };
    }
  }
}
