import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SYSTEM_ROLES, type SystemRole } from '../../rbac/rbac.constants';

const INVITE_ROLES = Object.values(SYSTEM_ROLES) as SystemRole[];

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsIn(INVITE_ROLES)
  role!: SystemRole;

  /** Required when role is portal_client (client internal code, e.g. CL-2026-001). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientCode?: string;
}
