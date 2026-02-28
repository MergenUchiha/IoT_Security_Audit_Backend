import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceType, LogSourceType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

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

  @ApiPropertyOptional({ enum: DeviceType, default: DeviceType.UNKNOWN })
  @IsOptional()
  @IsEnum(DeviceType)
  type?: DeviceType;

  @ApiPropertyOptional({ enum: LogSourceType, default: LogSourceType.SYSLOG })
  @IsOptional()
  @IsEnum(LogSourceType)
  logSourceType?: LogSourceType;

  @ApiPropertyOptional({
    description: 'JSON with log source params (syslog/mqtt/http)',
  })
  @IsOptional()
  logSourceMeta?: any;

  // ← нужно для фронта (форма отправляет isActive при создании)
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
