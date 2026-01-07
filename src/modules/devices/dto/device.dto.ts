import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsIP, IsArray, IsInt, IsOptional, Min } from 'class-validator';

export enum DeviceStatusEnum {
  ONLINE = 'online',
  OFFLINE = 'offline',
  WARNING = 'warning',
}

export enum RiskLevelEnum {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export class CreateDeviceDto {
  @ApiProperty({ example: 'Smart Thermostat', description: 'Device name' })
  @IsString()
  name: string;

  @ApiProperty({ example: '192.168.1.45', description: 'IP address' })
  @IsIP('4')
  ip: string;

  @ApiProperty({ example: 'IoT Sensor', description: 'Device type' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'TechCorp', description: 'Manufacturer' })
  @IsString()
  manufacturer: string;

  @ApiProperty({ example: 'v2.1.4', description: 'Firmware version' })
  @IsString()
  firmware: string;

  @ApiProperty({ example: [80, 443, 8080], description: 'Open ports', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  ports: number[];

  @ApiProperty({ example: ['HTTP', 'HTTPS', 'API'], description: 'Services', type: [String] })
  @IsArray()
  @IsString({ each: true })
  services: string[];

  @ApiProperty({ enum: DeviceStatusEnum, example: 'online', required: false })
  @IsOptional()
  @IsEnum(DeviceStatusEnum)
  status?: DeviceStatusEnum;

  @ApiProperty({ enum: RiskLevelEnum, example: 'medium', required: false })
  @IsOptional()
  @IsEnum(RiskLevelEnum)
  risk?: RiskLevelEnum;
}

export class UpdateDeviceDto {
  @ApiProperty({ example: 'Smart Thermostat Updated', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: DeviceStatusEnum, example: 'online', required: false })
  @IsOptional()
  @IsEnum(DeviceStatusEnum)
  status?: DeviceStatusEnum;

  @ApiProperty({ enum: RiskLevelEnum, example: 'high', required: false })
  @IsOptional()
  @IsEnum(RiskLevelEnum)
  risk?: RiskLevelEnum;

  @ApiProperty({ example: 'v2.1.5', required: false })
  @IsOptional()
  @IsString()
  firmware?: string;

  @ApiProperty({ example: [80, 443], required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  ports?: number[];

  @ApiProperty({ example: ['HTTP', 'HTTPS'], required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];
}