import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MinLength,
  Equals,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SUPPORTED_LOCALES } from '../../common/supported-locales';
import { ClientAddressInputDto } from '../../crm/dto/client-address.dto';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class MfaVerifyDto {
  @IsString()
  @Length(6, 9)
  code!: string;
}

export class MfaDisableDto {
  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @Length(6, 9)
  code!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class AcceptInviteDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  companyName?: string;

  @IsBoolean()
  @Equals(true, { message: 'GDPR consent is required to create an account' })
  gdprConsent!: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClientAddressInputDto)
  registeredLegalAddress?: ClientAddressInputDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ClientAddressInputDto)
  correspondenceAddress?: ClientAddressInputDto;
}

export class UpdateLocaleDto {
  @IsString()
  @IsIn(SUPPORTED_LOCALES)
  preferredLocale!: string;
}
