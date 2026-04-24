import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateScheduleDto {
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
