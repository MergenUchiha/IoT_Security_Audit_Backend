import { Controller, Get, Param, Res, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { StreamService } from './stream.service';

@ApiTags('stream')
@Controller('devices/:deviceId/logs')
export class StreamController {
  private readonly logger = new Logger(StreamController.name);

  constructor(private readonly stream: StreamService) {}

  @Get('stream')
  streamLogs(@Param('deviceId') deviceId: string, @Res() res: Response) {
    this.logger.log(`[Stream] Client connected for device: ${deviceId}`);

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // keep-alive ping
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
