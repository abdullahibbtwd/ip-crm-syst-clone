import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
  Equals,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SUPPORTED_LOCALES } from '../../common/supported-locales';
import { ClientAddressInputDto } from '../../crm/dto/client-address.dto';
import { SUPPORTED_INVOICE_CURRENCIES } from '../../crm/clients/client-billing.utils';

const currencyValues = [...SUPPORTED_INVOICE_CURRENCIES];

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

  @IsOptional()
  @IsString()
  billingName?: string;

  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @IsOptional()
  @IsString()
  vatNo?: string;

  @IsOptional()
  @IsIn(currencyValues)
  preferredCurrency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  paymentTermsDays?: number;

  @IsOptional()
  @IsString()
  billingAddressLine1?: string;

  @IsOptional()
  @IsString()
  billingAddressLine2?: string;

  @IsOptional()
  @IsString()
  billingCity?: string;

  @IsOptional()
  @IsString()
  billingRegion?: string;

  @IsOptional()
  @IsString()
  billingPostalCode?: string;

  @IsOptional()
  @IsString()
  billingCountry?: string;
}

export class UpdateLocaleDto {
  @IsString()
  @IsIn(SUPPORTED_LOCALES)
  preferredLocale!: string;
}
