import { ApiPropertyOptional } from '@nestjs/swagger';
import { LogLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';

export class LogsQueryDto {
  @ApiPropertyOptional({ description: 'ISO date from' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO date to' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: LogLevel })
  @IsOptional()
  @IsEnum(LogLevel)
  level?: LogLevel;

  @ApiPropertyOptional({ description: 'Search query in message' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 200, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  limit?: number = 200;
}
