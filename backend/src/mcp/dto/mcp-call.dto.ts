import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class McpCallToolDto {
  @IsString()
  @MinLength(1)
  toolName!: string;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;
}
