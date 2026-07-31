import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ClientType } from '../../../generated/prisma/client';

/**
 * Link an existing Client, or supply create-lite fields to create one on convert.
 * Omit / leave empty when the party is the same as the instructing client.
 */
export class IntakePartyDto {
  @IsOptional()
  @IsUUID()
  existingClientId?: string;

  @ValidateIf((o: IntakePartyDto) => !o.existingClientId && Boolean(o.companyName || o.fullName))
  @IsEnum(ClientType)
  type?: ClientType;

  @ValidateIf(
    (o: IntakePartyDto) =>
      !o.existingClientId && o.type === ClientType.company,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyName?: string;

  @ValidateIf(
    (o: IntakePartyDto) =>
      !o.existingClientId && o.type === ClientType.individual,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country?: string;
}

export function isIntakePartyProvided(
  party?: IntakePartyDto | null,
): party is IntakePartyDto {
  if (!party) return false;
  if (party.existingClientId?.trim()) return true;
  if (party.companyName?.trim() || party.fullName?.trim()) return true;
  return false;
}
