import { IsIn, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { RELATIONSHIP_TYPES } from '../../crm.constants';

export class CreateRelatedCompanyDto {
  @ValidateIf((o: CreateRelatedCompanyDto) => !o.externalName)
  @IsUUID()
  relatedClientId?: string;

  @ValidateIf((o: CreateRelatedCompanyDto) => !o.relatedClientId)
  @IsString()
  externalName?: string;

  @IsIn(RELATIONSHIP_TYPES)
  relationshipType!: (typeof RELATIONSHIP_TYPES)[number];

  @IsOptional()
  @IsString()
  notes?: string;
}
