// src/logs/logs.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LogLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { LogsService } from './logs.service';

class LogsQueryDto {
  @IsOptional()
  @IsEnum(LogLevel)
  level?: LogLevel;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 200;

  @IsOptional()
  from?: string;

  @IsOptional()
  to?: string;
}

@ApiTags('logs')
@Controller('devices/:deviceId/logs')
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  @Get()
  list(@Param('deviceId') deviceId: string, @Query() q: LogsQueryDto) {
    return this.logs.listForDevice(deviceId, {
      level: q.level,
      limit: q.limit ?? 200,
      from: q.from ? new Date(q.from) : undefined,
      to: q.to ? new Date(q.to) : undefined,
    });
  }
}
