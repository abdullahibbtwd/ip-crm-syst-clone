import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../crm/dto/pagination.dto';
import { TEAM_ASSIGNABLE_ROLES } from './update-user-role.dto';

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

  /** Filter team users by a single staff role. Ignored for portal segment. */
  @IsOptional()
  @IsIn(TEAM_ASSIGNABLE_ROLES)
  role?: (typeof TEAM_ASSIGNABLE_ROLES)[number];
}
