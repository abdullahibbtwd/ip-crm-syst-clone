import { ConfigService } from '@nestjs/config';
import { MinioStorageService } from './minio-storage.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/obj'),
}));

describe('MinioStorageService', () => {
  let service: MinioStorageService;
  let send: jest.Mock;

  beforeEach(() => {
    send = jest.fn().mockResolvedValue({});
    service = new MinioStorageService({
      get: (_key: string, fallback?: string) => fallback,
    } as unknown as ConfigService);

    // Skip onModuleInit network; inject a fake S3 client.
    (service as unknown as { client: { send: jest.Mock }; bucket: string }).client =
      { send };
    (service as unknown as { bucket: string }).bucket = 'test-bucket';
  });

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
