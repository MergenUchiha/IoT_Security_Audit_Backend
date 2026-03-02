import { Controller, Get, Param, Res, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { StreamService } from './stream.service';
import { PrismaService } from 'src/modules/prisma/prisma.service';

@ApiTags('stream')
@Controller('devices/:deviceId/logs')
export class StreamController {
  private readonly logger = new Logger(StreamController.name);
  constructor(
    private readonly stream: StreamService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('stream')
  async streamLogs(@Param('deviceId') deviceId: string, @Res() res: Response) {
    this.logger.log(`[Stream] Client connected for device: ${deviceId}`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Отправляем последние 50 логов сразу при подключении
    const recent = await this.prisma.logEntry.findMany({
      where: { deviceId },
      orderBy: { ts: 'desc' },
      take: 50,
    });
    for (const log of recent.reverse()) {
      res.write(`event: log\ndata: ${JSON.stringify(log)}\n\n`);
    }

    const ping = setInterval(() => {
      res.write(`event: ping\ndata: {}\n\n`);
    }, 15000);

    const unsubscribe = this.stream.subscribe(deviceId, (log) => {
      res.write(`event: log\ndata: ${JSON.stringify(log)}\n\n`);
    });

    reqOnClose(res, () => {
      clearInterval(ping);
      unsubscribe();
      this.logger.log(`[Stream] Client disconnected for device: ${deviceId}`);
    });
  }
}

function reqOnClose(res: Response, fn: () => void) {
  res.on('close', fn);
  res.on('finish', fn);
}
