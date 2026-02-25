import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { StreamService } from './stream.service';

@ApiTags('stream')
@Controller('devices/:deviceId/logs')
export class StreamController {
  constructor(private readonly stream: StreamService) {}

  @Get('stream')
  streamLogs(@Param('deviceId') deviceId: string, @Res() res: Response) {
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
    });
  }
}

function reqOnClose(res: Response, fn: () => void) {
  res.on('close', fn);
  res.on('finish', fn);
}
