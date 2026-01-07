import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';

export enum ScanTypeEnum {
  FULL = 'full',
  FIRMWARE = 'firmware',
  NETWORK = 'network',
  PORTS = 'ports',
}

export class StartScanDto {
  @ApiProperty({ example: 'uuid-of-device', description: 'Device ID to scan' })
  @IsString()
  deviceId: string;

  @ApiProperty({ 
    enum: ScanTypeEnum, 
    example: 'full', 
    description: 'Type of scan to perform' 
  })
  @IsEnum(ScanTypeEnum)
  type: ScanTypeEnum;
}