import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AckAlertDto {
  @ApiPropertyOptional({ description: 'Optional note/reason' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
