import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SecretsEncryptionService } from './secrets-encryption.service'
import type { SystemSecretCategory } from './secrets.constants'

export type SecretStatus = {
  category: string
  key: string
  configured: boolean
  lastFour: string | null
  hasNonSecret: boolean
  nonSecretValue: string | null
  updatedAt: string | null
}

@Injectable()
export class SystemSecretsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: SecretsEncryptionService,
  ) {}

  async getStatus(
    category: SystemSecretCategory,
    key: string,
  ): Promise<SecretStatus> {
    const row = await this.prisma.systemSecret.findUnique({
      where: { category_key: { category, key } },
    })
    return {
      category,
      key,
      configured: Boolean(row?.encryptedValue || row?.nonSecretValue),
      lastFour: row?.lastFour ?? null,
      hasNonSecret: Boolean(row?.nonSecretValue),
      nonSecretValue: row?.nonSecretValue ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    }
  }

  async getStatuses(
    category: SystemSecretCategory,
    keys: string[],
  ): Promise<SecretStatus[]> {
    const rows = await this.prisma.systemSecret.findMany({
      where: { category, key: { in: keys } },
    })
    const byKey = new Map(rows.map((r) => [r.key, r]))
    return keys.map((key) => {
      const row = byKey.get(key)
      return {
        category,
        key,
        configured: Boolean(row?.encryptedValue || row?.nonSecretValue),
        lastFour: row?.lastFour ?? null,
        hasNonSecret: Boolean(row?.nonSecretValue),
        nonSecretValue: row?.nonSecretValue ?? null,
        updatedAt: row?.updatedAt?.toISOString() ?? null,
      }
    })
  }

  /** Decrypt secret; returns null if missing. */
  async getSecretValue(
    category: SystemSecretCategory,
    key: string,
  ): Promise<string | null> {
    const row = await this.prisma.systemSecret.findUnique({
      where: { category_key: { category, key } },
    })
    if (!row?.encryptedValue) return null
    return this.encryption.decrypt(row.encryptedValue)
  }

  async getNonSecretValue(
    category: SystemSecretCategory,
    key: string,
  ): Promise<string | null> {
    const row = await this.prisma.systemSecret.findUnique({
      where: { category_key: { category, key } },
    })
    return row?.nonSecretValue ?? null
  }

  async upsertSecret(params: {
    category: SystemSecretCategory
    key: string
    plaintext: string
    updatedById?: string | null
  }): Promise<SecretStatus> {
    const trimmed = params.plaintext.trim()
    const encryptedValue = this.encryption.encrypt(trimmed)
    const lastFour = trimmed.length >= 4 ? trimmed.slice(-4) : trimmed

    const row = await this.prisma.systemSecret.upsert({
      where: {
        category_key: { category: params.category, key: params.key },
      },
      create: {
        category: params.category,
        key: params.key,
        encryptedValue,
        lastFour,
        updatedById: params.updatedById ?? null,
      },
      update: {
        encryptedValue,
        lastFour,
        updatedById: params.updatedById ?? null,
      },
    })

    return {
      category: row.category,
      key: row.key,
      configured: true,
      lastFour: row.lastFour,
      hasNonSecret: Boolean(row.nonSecretValue),
      nonSecretValue: row.nonSecretValue,
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async upsertNonSecret(params: {
    category: SystemSecretCategory
    key: string
    value: string
    updatedById?: string | null
  }): Promise<SecretStatus> {
    const nonSecretValue = params.value.trim()
    const row = await this.prisma.systemSecret.upsert({
      where: {
        category_key: { category: params.category, key: params.key },
      },
      create: {
        category: params.category,
        key: params.key,
        nonSecretValue,
        updatedById: params.updatedById ?? null,
      },
      update: {
        nonSecretValue,
        updatedById: params.updatedById ?? null,
      },
    })

    return {
      category: row.category,
      key: row.key,
      configured: Boolean(row.encryptedValue || row.nonSecretValue),
      lastFour: row.lastFour,
      hasNonSecret: Boolean(row.nonSecretValue),
      nonSecretValue: row.nonSecretValue,
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async deleteSecret(
    category: SystemSecretCategory,
    key: string,
  ): Promise<void> {
    await this.prisma.systemSecret.deleteMany({ where: { category, key } })
  }
}
