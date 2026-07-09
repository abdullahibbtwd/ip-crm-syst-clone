import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { DocumentCategory } from '../../../generated/prisma/client';

export class LinkUnlinkedEmailDto {
  @IsUUID()
  matterId!: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;
}
