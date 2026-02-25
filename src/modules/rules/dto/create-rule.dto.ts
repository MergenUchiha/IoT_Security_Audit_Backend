import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType, Severity } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRuleDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    description:
      'JavaScript regex string (case-insensitive is added automatically)',
  })
  @IsString()
  @MaxLength(500)
  matchRegex!: string;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  windowSec?: number = 60;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  threshold?: number = 10;

  @ApiPropertyOptional({ enum: Severity, default: Severity.MEDIUM })
  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity = Severity.MEDIUM;

  @ApiPropertyOptional({ enum: DeviceType })
  @IsOptional()
  @IsEnum(DeviceType)
  deviceTypeFilter?: DeviceType;

  @ApiPropertyOptional({
    description: 'If set, only this deviceId triggers the rule',
  })
  @IsOptional()
  @IsString()
  deviceIdFilter?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;
}
