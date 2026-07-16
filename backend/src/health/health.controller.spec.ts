import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { MinioStorageService } from '../storage/minio-storage.service';
import { HealthController } from './health.controller';

const redisInstance = {
  connect: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('ioredis', () => jest.fn(() => redisInstance));

describe('HealthController', () => {
  const prisma = { $queryRaw: jest.fn() };
  const storage = { checkHealth: jest.fn() };
  const config = { get: jest.fn() };

  const controller = new HealthController(
    prisma as unknown as PrismaService,
    storage as unknown as MinioStorageService,
    config as unknown as ConfigService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    storage.checkHealth.mockResolvedValue({ ok: true, latencyMs: 1 });
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'REDIS_HOST') return 'localhost';
      if (key === 'REDIS_PORT') return '6379';
      return fallback;
    });
    redisInstance.connect.mockResolvedValue(undefined);
    redisInstance.ping.mockResolvedValue('PONG');
    redisInstance.quit.mockResolvedValue('OK');
  });

  it('detailed returns ok when all checks pass', async () => {
    const result = await controller.detailed();

    expect(result.status).toBe('ok');
    expect(result.checks.database.ok).toBe(true);
    expect(result.checks.redis.ok).toBe(true);
    expect(result.checks.storage.ok).toBe(true);
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(storage.checkHealth).toHaveBeenCalled();
    expect(redisInstance.connect).toHaveBeenCalled();
    expect(redisInstance.ping).toHaveBeenCalled();
    expect(redisInstance.quit).toHaveBeenCalled();
  });

  it('detailed returns degraded when a check fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('db down'));

    const result = await controller.detailed();

    expect(result.status).toBe('degraded');
    expect(result.checks.database.ok).toBe(false);
    expect(result.checks.database.error).toBe('db down');
  });
});
