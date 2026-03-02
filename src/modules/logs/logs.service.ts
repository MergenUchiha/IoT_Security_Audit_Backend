// src/modules/logs/logs.service.ts
import { Injectable } from '@nestjs/common';
import { LogLevel, LogSourceType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StreamService } from '../../ingest/stream/stream.service';
import { CorrelationService } from '../detection/correlation.service';

@Injectable()
export class LogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stream: StreamService,
    private readonly correlation: CorrelationService,
  ) {}

  async create(
    deviceId: string,
    data: {
      ts?: Date;
      level?: LogLevel;
      source: LogSourceType;
      app?: string | null;
      host?: string | null;
      message: string;
      raw?: Record<string, unknown> | null;
    },
  ) {
    const log = await this.prisma.logEntry.create({
      data: {
        deviceId,
        ts: data.ts ?? new Date(),
        level: data.level ?? LogLevel.INFO,
        source: data.source,
        app: data.app ?? null,
        host: data.host ?? null,
        message: data.message,
        raw: (data.raw as Prisma.InputJsonValue) ?? undefined,
      },
    });

    // Publish to SSE stream
    this.stream.publishLog(deviceId, log);

    // Run correlation rules asynchronously
    this.correlation.processLog(log).catch(() => {});

    return log;
  }

  listForDevice(
    deviceId: string,
    params: {
      level?: LogLevel;
      limit: number;
      from?: Date;
      to?: Date;
    },
  ) {
    return this.prisma.logEntry.findMany({
      where: {
        deviceId,
        level: params.level,
        ts: {
          gte: params.from,
          lte: params.to,
        },
      },
      orderBy: { ts: 'desc' },
      take: params.limit,
    });
  }
}
