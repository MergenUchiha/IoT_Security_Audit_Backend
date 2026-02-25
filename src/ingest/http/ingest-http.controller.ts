import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LogSourceType } from '@prisma/client';
import { CreateLogDto } from 'src/modules/logs/dto/create-log.dto';
import { LogsService } from 'src/modules/logs/logs.service';

@ApiTags('ingest')
@Controller('ingest')
export class IngestHttpController {
  constructor(private readonly logs: LogsService) {}

  @Post(':deviceId/logs')
  async ingestLogs(
    @Param('deviceId') deviceId: string,
    @Body() dto: CreateLogDto,
  ) {
    const ts = dto.ts ? new Date(dto.ts) : undefined;

    return this.logs.create(deviceId, {
      ts,
      level: dto.level,
      source: dto.source ?? LogSourceType.HTTP,
      app: dto.app,
      host: dto.host,
      message: dto.message,
      raw: dto.raw,
    });
  }
}
