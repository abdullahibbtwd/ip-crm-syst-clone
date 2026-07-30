import {
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { DocumentCategory } from '../../../generated/prisma/client';

export class LinkUnlinkedEmailDto {
  @ValidateIf((o: LinkUnlinkedEmailDto) => !o.clientId)
  @IsUUID()
  matterId?: string;

  @ValidateIf((o: LinkUnlinkedEmailDto) => !o.matterId)
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;
}
