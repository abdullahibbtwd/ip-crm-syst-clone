import { IsOptional, IsString, MaxLength } from 'class-validator'

export class UpsertAccountingCredentialsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientId?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  clientSecret?: string

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  accessToken?: string

  /** Xero tenant id or QuickBooks company realm id */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  orgId?: string
}
