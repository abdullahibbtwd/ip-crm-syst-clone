import { SYSTEM_SECRET_CATEGORY } from './secrets.constants';
import { SystemSecretsService } from './system-secrets.service';
import type { SecretsEncryptionService } from './secrets-encryption.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('SystemSecretsService', () => {
  let service: SystemSecretsService;
  let prisma: {
    systemSecret: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let encryption: { encrypt: jest.Mock; decrypt: jest.Mock };

  beforeEach(() => {
    prisma = {
      systemSecret: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    encryption = {
      encrypt: jest.fn((v: string) => `enc(${v})`),
      decrypt: jest.fn((v: string) => v.replace(/^enc\(/, '').replace(/\)$/, '')),
    };
    service = new SystemSecretsService(
      prisma as unknown as PrismaService,
      encryption as unknown as SecretsEncryptionService,
    );
  });

  it('getStatus reports unconfigured when missing', async () => {
    prisma.systemSecret.findUnique.mockResolvedValue(null);
    await expect(
      service.getStatus(SYSTEM_SECRET_CATEGORY.INTEGRATION, 'epo.consumer_key'),
    ).resolves.toMatchObject({
      configured: false,
      lastFour: null,
    });
  });

  it('getStatuses preserves key order and fills gaps', async () => {
    prisma.systemSecret.findMany.mockResolvedValue([
      {
        key: 'b',
        encryptedValue: 'x',
        lastFour: 'xxxx',
        nonSecretValue: null,
        updatedAt: new Date('2026-01-01'),
      },
    ]);

    const statuses = await service.getStatuses(
      SYSTEM_SECRET_CATEGORY.INTEGRATION,
      ['a', 'b'],
    );

    expect(statuses.map((s) => s.key)).toEqual(['a', 'b']);
    expect(statuses[0].configured).toBe(false);
    expect(statuses[1].configured).toBe(true);
  });

  it('getSecretValue decrypts ciphertext or returns null', async () => {
    prisma.systemSecret.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.getSecretValue(SYSTEM_SECRET_CATEGORY.SSO, 'k'),
    ).resolves.toBeNull();

    prisma.systemSecret.findUnique.mockResolvedValueOnce({
      encryptedValue: 'enc(secret)',
    });
    await expect(
      service.getSecretValue(SYSTEM_SECRET_CATEGORY.SSO, 'k'),
    ).resolves.toBe('secret');
  });

  it('upsertSecret encrypts, stores lastFour, and returns status', async () => {
    prisma.systemSecret.upsert.mockResolvedValue({
      category: SYSTEM_SECRET_CATEGORY.INTEGRATION,
      key: 'epo.consumer_key',
      lastFour: 'cret',
      nonSecretValue: null,
      updatedAt: new Date('2026-02-01'),
    });

    const status = await service.upsertSecret({
      category: SYSTEM_SECRET_CATEGORY.INTEGRATION,
      key: 'epo.consumer_key',
      plaintext: '  secret  ',
      updatedById: 'u1',
    });

    expect(encryption.encrypt).toHaveBeenCalledWith('secret');
    expect(prisma.systemSecret.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          encryptedValue: 'enc(secret)',
          lastFour: 'cret',
        }),
      }),
    );
    expect(status.configured).toBe(true);
    expect(status.lastFour).toBe('cret');
  });
});
