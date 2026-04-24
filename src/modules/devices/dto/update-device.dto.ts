import { ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType, LogSourceType } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateDeviceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  hostname?: string;

  @ApiPropertyOptional({ enum: DeviceType })
  @IsOptional()
  @IsEnum(DeviceType)
  type?: DeviceType;

  @ApiPropertyOptional({ enum: LogSourceType })
  @IsOptional()
  @IsEnum(LogSourceType)
  logSourceType?: LogSourceType;

  @ApiPropertyOptional()
  @IsOptional()
  logSourceMeta?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  scheduleEnabled?: boolean;

  @ApiPropertyOptional({ example: '0 3 * * *' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^([\d\*\/\-,]+\s+){4}[\d\*\/\-,]+$/, {
    message: 'scheduleCron must be a valid cron expression (5 fields: min hour dom mon dow)',
  })
  scheduleCron?: string;

  @ApiPropertyOptional({ example: 'admin@example.com' })
  @IsOptional()
  @IsEmail()
  scheduleEmail?: string;
}
