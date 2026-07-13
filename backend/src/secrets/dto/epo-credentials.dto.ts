import { IsOptional, IsString, MinLength } from 'class-validator'

export class UpsertEpoCredentialsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  consumerKey?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  consumerSecret?: string

  @IsOptional()
  @IsString()
  apiBaseUrl?: string

  @IsOptional()
  @IsString()
  authUrl?: string
}
