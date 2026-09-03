import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketLifecycleConfigurationCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Staging mailbox `.eml` prefix — keep in sync with email-sync ingest keys. */
const MAILBOX_STAGING_PREFIX = 'mailbox/';
const DEFAULT_MAILBOX_STAGING_RETENTION_DAYS = 30;

@Injectable()
export class MinioStorageService implements OnModuleInit {
  private readonly logger = new Logger(MinioStorageService.name);
  private client!: S3Client;
  /** Signs browser-facing URLs; may differ from the internal Docker hostname. */
  private signingClient!: S3Client;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.config.get<string>('MINIO_PORT', '9000');
    const useSsl = this.config.get<string>('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.config.get<string>('MINIO_ACCESS_KEY', 'crm_minio');
    const secretKey = this.config.get<string>('MINIO_SECRET_KEY', 'crm_minio_secret');
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'ip-crm-documents');

    this.client = this.createS3Client(endpoint, port, useSsl, accessKey, secretKey);

    const publicEndpoint =
      this.config.get<string>('MINIO_PUBLIC_ENDPOINT')?.trim() || endpoint;
    const publicPort =
      this.config.get<string>('MINIO_PUBLIC_PORT')?.trim() || port;
    const publicUseSsl =
      this.config.get<string>('MINIO_PUBLIC_USE_SSL', useSsl ? 'true' : 'false') ===
      'true';

    this.signingClient =
      publicEndpoint === endpoint && publicPort === port && publicUseSsl === useSsl
        ? this.client
        : this.createS3Client(
            publicEndpoint,
            publicPort,
            publicUseSsl,
            accessKey,
            secretKey,
          );

    await this.ensureBucket();
    await this.ensureMailboxStagingLifecycle();
  }

  private createS3Client(
    host: string,
    port: string,
    useSsl: boolean,
    accessKey: string,
    secretKey: string,
  ) {
    const protocol = useSsl ? 'https' : 'http';
    const config: S3ClientConfig = {
      region: this.config.get<string>('MINIO_REGION', 'us-east-1'),
      endpoint: `${protocol}://${host}:${port}`,
      forcePathStyle: true,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      // MinIO often rejects AWS SDK v3 default checksum headers on GetObject.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    };
    return new S3Client(config);
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

  async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds = 3600,
    extras?: {
      disposition?: 'inline' | 'attachment';
      fileName?: string;
      contentType?: string | null;
    },
  ) {
    const fileName = extras?.fileName?.replace(/[\r\n"]/g, '_').trim();
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: extras?.disposition
        ? `${extras.disposition}; filename="${fileName || 'document'}"`
        : undefined,
      ResponseContentType: extras?.contentType || undefined,
    });
    return getSignedUrl(this.signingClient ?? this.client, command, {
      expiresIn: expiresInSeconds,
    });
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
