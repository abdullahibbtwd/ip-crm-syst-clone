import { IsString, MaxLength, MinLength } from 'class-validator';

export class ParsePastedEmailDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500_000)
  text!: string;
}
