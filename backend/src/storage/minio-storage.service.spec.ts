import { ConfigService } from '@nestjs/config';
import { MinioStorageService } from './minio-storage.service';

jest.mock('@aws-sdk/client-s3', () => {
  const send = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send })),
    __mockSend: send,
    CreateBucketCommand: jest.fn().mockImplementation((input) => ({ input, name: 'CreateBucket' })),
    DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input, name: 'DeleteObject' })),
    GetObjectCommand: jest.fn().mockImplementation((input) => ({ input, name: 'GetObject' })),
    HeadBucketCommand: jest.fn().mockImplementation((input) => ({ input, name: 'HeadBucket' })),
    PutBucketLifecycleConfigurationCommand: jest
      .fn()
      .mockImplementation((input) => ({ input, name: 'PutBucketLifecycle' })),
    PutObjectCommand: jest.fn().mockImplementation((input) => ({ input, name: 'PutObject' })),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/obj'),
}));

describe('MinioStorageService', () => {
  let service: MinioStorageService;
  let send: jest.Mock;
  let configGet: jest.Mock;

  beforeEach(() => {
    const s3 = jest.requireMock('@aws-sdk/client-s3');
    send = s3.__mockSend;
    send.mockReset();
    send.mockResolvedValue({});
    configGet = jest.fn((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: '9000',
        MINIO_USE_SSL: 'false',
        MINIO_ACCESS_KEY: 'key',
        MINIO_SECRET_KEY: 'secret',
        MINIO_BUCKET: 'test-bucket',
        MINIO_REGION: 'us-east-1',
        MAILBOX_STAGING_RETENTION_DAYS: '30',
      };
      return values[key] ?? fallback;
    });

    service = new MinioStorageService({
      get: configGet,
    } as unknown as ConfigService);

    (service as unknown as { client: { send: jest.Mock }; bucket: string }).client =
      { send };
    (service as unknown as { bucket: string }).bucket = 'test-bucket';
  });

  describe('onModuleInit', () => {
    it('creates bucket when head fails and sets lifecycle', async () => {
      send
        .mockRejectedValueOnce(new Error('missing bucket'))
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      await service.onModuleInit();

      expect(send).toHaveBeenCalledTimes(3);
      expect(send.mock.calls[0][0].name).toBe('HeadBucket');
      expect(send.mock.calls[1][0].name).toBe('CreateBucket');
      expect(send.mock.calls[2][0].name).toBe('PutBucketLifecycle');
    });

    it('skips lifecycle when retention days <= 0', async () => {
      configGet.mockImplementation((key: string, fallback?: string) => {
        if (key === 'MAILBOX_STAGING_RETENTION_DAYS') return '0';
        if (key === 'MINIO_BUCKET') return 'test-bucket';
        return fallback;
      });
      send.mockResolvedValue({});

      await service.onModuleInit();

      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][0].name).toBe('HeadBucket');
    });

    it('tolerates lifecycle configuration failures', async () => {
      send.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('lifecycle denied'));

      await service.onModuleInit();

      expect(send).toHaveBeenCalledTimes(2);
    });
  });

  describe('object operations', () => {
    it('putObject sends PutObjectCommand', async () => {
      await service.putObject('matters/a.pdf', Buffer.from('pdf'), 'application/pdf');
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'matters/a.pdf',
            ContentType: 'application/pdf',
          }),
        }),
      );
    });

    it('deleteObject sends DeleteObjectCommand', async () => {
      await service.deleteObject('matters/a.pdf');
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-bucket',
            Key: 'matters/a.pdf',
          }),
        }),
      );
    });

    it('getObjectBuffer concatenates streamed body chunks', async () => {
      async function* body() {
        yield new Uint8Array([1, 2]);
        yield new Uint8Array([3]);
      }
      send.mockResolvedValue({ Body: body() });

      const buf = await service.getObjectBuffer('k');
      expect(buf.equals(Buffer.from([1, 2, 3]))).toBe(true);
    });

    it('getObjectBuffer throws when body is missing', async () => {
      send.mockResolvedValue({ Body: undefined });
      await expect(service.getObjectBuffer('missing')).rejects.toThrow(
        /Object not found/,
      );
    });

    it('checkHealth reports ok / error', async () => {
      send.mockResolvedValueOnce({});
      await expect(service.checkHealth()).resolves.toMatchObject({ ok: true });

      send.mockRejectedValueOnce(new Error('offline'));
      await expect(service.checkHealth()).resolves.toMatchObject({
        ok: false,
        error: 'offline',
      });
    });

    it('getPresignedDownloadUrl uses signer', async () => {
      const { getSignedUrl } = jest.requireMock('@aws-sdk/s3-request-presigner');
      await expect(service.getPresignedDownloadUrl('k', 60)).resolves.toBe(
        'https://signed.example/obj',
      );
      expect(getSignedUrl).toHaveBeenCalled();
    });
  });
});
