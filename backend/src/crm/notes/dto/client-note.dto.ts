import { IsString, MinLength } from 'class-validator';

export class CreateClientNoteDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

export class UpdateClientNoteDto {
  @IsString()
  @MinLength(1)
  body!: string;
}
