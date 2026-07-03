import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../crm/dto/pagination.dto';

export enum UserSegment {
  team = 'team',
  portal = 'portal',
}

export class UserQueryDto extends PaginationQueryDto {
  @IsEnum(UserSegment)
  segment!: UserSegment;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}
