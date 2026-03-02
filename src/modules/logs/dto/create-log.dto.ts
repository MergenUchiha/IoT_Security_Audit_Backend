import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LogLevel, LogSourceType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLogDto {
  @ApiPropertyOptional({ description: 'ISO timestamp (optional)' })
  @IsOptional()
  @IsString()
  ts?: string;

  @ApiPropertyOptional({ enum: LogLevel })
  @IsOptional()
  @IsEnum(LogLevel)
  level?: LogLevel;

  @ApiPropertyOptional({ enum: LogSourceType })
  @IsOptional()
  @IsEnum(LogSourceType)
  source?: LogSourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  app?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  host?: string;

  @ApiProperty()
  @IsString()
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  raw?: any;
}
