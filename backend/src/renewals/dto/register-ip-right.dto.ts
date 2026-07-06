import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterIpRightDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  registrationNumber!: string;

  @IsDateString()
  registrationDate!: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
