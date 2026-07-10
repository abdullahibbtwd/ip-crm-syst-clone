import { IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength, ArrayMinSize, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentCategory } from '../../../generated/prisma/client';

export class OutboundAttachmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  contentType!: string;

  @IsString()
  @MinLength(1)
  contentBase64!: string;
}

export class SendOutboundEmailDto {
  @IsUUID()
  connectionId!: string;

  @IsUUID()
  matterId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  to!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500_000)
  bodyText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  bodyHtml?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  inReplyToMessageId?: string;

  @IsOptional()
  @IsUUID()
  replyToUnlinkedEmailId?: string;

  @IsOptional()
  @IsUUID()
  replyToCorrespondenceId?: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OutboundAttachmentDto)
  attachments?: OutboundAttachmentDto[];
}

export class DraftReplyQueryDto {
  @IsUUID()
  matterId!: string;

  @IsOptional()
  @IsUUID()
  unlinkedEmailId?: string;

  @IsOptional()
  @IsUUID()
  correspondenceId?: string;
}
