import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  CounterpartyRelationship,
  IntakeEnquirerType,
  IntakeMatterType,
  IntakeReferralSource,
  IntakeStatus,
  IntakeUrgency,
} from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../crm/dto/pagination.dto';

export class CreateCounterpartyDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsEnum(CounterpartyRelationship)
  relationship!: CounterpartyRelationship;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateIntakeLeadDto {
  @IsEnum(IntakeEnquirerType)
  enquirerType!: IntakeEnquirerType;

  @ValidateIf((o: CreateIntakeLeadDto) => o.enquirerType === IntakeEnquirerType.company)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyName?: string;

  @ValidateIf((o: CreateIntakeLeadDto) => o.enquirerType === IntakeEnquirerType.individual)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2)
  country!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[\d\s+\-().]+$/, {
    message: 'Phone may only contain digits, +, spaces, dashes, or parentheses',
  })
  @Matches(/^(?:\D*\d){6,15}\D*$/, {
    message: 'Enter a valid phone number (6–15 digits)',
  })
  phone?: string;

  @IsEnum(IntakeMatterType)
  matterType!: IntakeMatterType;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsEnum(IntakeUrgency)
  urgency?: IntakeUrgency;

  @IsEnum(IntakeReferralSource)
  referralSource!: IntakeReferralSource;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  referredBy?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCounterpartyDto)
  counterparties?: CreateCounterpartyDto[];
}

export class UpdateIntakeLeadDto {
  @IsOptional()
  @IsEnum(IntakeStatus)
  status?: IntakeStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEnum(IntakeMatterType)
  matterType?: IntakeMatterType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(IntakeUrgency)
  urgency?: IntakeUrgency;

  @IsOptional()
  @IsEnum(IntakeReferralSource)
  referralSource?: IntakeReferralSource;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  referredBy?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ResolveConflictDto {
  @IsIn(['approved', 'rejected', 'overridden'])
  decision!: 'approved' | 'rejected' | 'overridden';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class ConvertIntakeDto {
  @IsBoolean()
  gdprConsent!: boolean;

  @IsOptional()
  @IsUUID()
  holdingGroupId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class IntakeQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(IntakeStatus)
  status?: IntakeStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
