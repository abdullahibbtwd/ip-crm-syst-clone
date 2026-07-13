import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { RequirePermissions } from '../common/decorators/permissions.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { SkipAudit } from '../common/decorators/audit.decorator'
import { PrismaService } from '../prisma/prisma.service'
import { SYSTEM_ROLES } from '../rbac/rbac.constants'
import { MinioStorageService } from '../storage/minio-storage.service'

type CheckResult = {
  ok: boolean
  latencyMs: number
  error?: string
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MinioStorageService,
    private readonly config: ConfigService,
  ) {}

  @Get('detailed')
  @SkipAudit()
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.IT_ADMIN)
  @RequirePermissions('role:read')
  async detailed() {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.storage.checkHealth(),
    ])

    const checks = { database, redis, storage }
    const allOk = Object.values(checks).every((c) => c.ok)

    return {
      status: allOk ? ('ok' as const) : ('degraded' as const),
      checkedAt: new Date().toISOString(),
      checks,
    }
  }

  private async checkDatabase(): Promise<CheckResult> {
    const started = Date.now()
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { ok: true, latencyMs: Date.now() - started }
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : 'Database unreachable',
      }
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    const started = Date.now()
    const host = this.config.get<string>('REDIS_HOST', 'localhost')
    const port = Number(this.config.get<string>('REDIS_PORT', '6379'))
    const redis = new Redis({
      host,
      port,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    })
    try {
      await redis.connect()
      const pong = await redis.ping()
      await redis.quit()
      return {
        ok: pong === 'PONG',
        latencyMs: Date.now() - started,
        error: pong === 'PONG' ? undefined : `Unexpected ping response: ${pong}`,
      }
    } catch (err) {
      try {
        redis.disconnect()
      } catch {
        /* ignore */
      }
      return {
        ok: false,
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : 'Redis unreachable',
      }
    }
  }
}
