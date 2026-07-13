import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator'

export class UpsertSsoSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  microsoftClientId?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  microsoftClientSecret?: string

  @IsOptional()
  @IsString()
  microsoftTenantId?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  googleClientId?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  googleClientSecret?: string

  @IsOptional()
  @IsBoolean()
  requireMfaForInternal?: boolean
}
