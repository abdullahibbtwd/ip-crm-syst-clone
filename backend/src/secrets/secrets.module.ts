import { Global, Module } from '@nestjs/common'
import { SecretsEncryptionService } from './secrets-encryption.service'
import { SystemSecretsService } from './system-secrets.service'

@Global()
@Module({
  providers: [SecretsEncryptionService, SystemSecretsService],
  exports: [SecretsEncryptionService, SystemSecretsService],
})
export class SecretsModule {}
