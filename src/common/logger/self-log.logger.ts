// src/common/logger/self-log.logger.ts
import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogLevel, LogSourceType } from '@prisma/client';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { StreamService } from '../../ingest/stream/stream.service';

const NEST_TO_IOT_LEVEL: Record<string, LogLevel> = {
  verbose: LogLevel.TRACE,
  debug: LogLevel.DEBUG,
  log: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  fatal: LogLevel.FATAL,
};

@Injectable({ scope: Scope.DEFAULT })
export class SelfLogLogger extends ConsoleLogger {
  private deviceId: string | null = null;
  private prisma: PrismaService | null = null;
  private stream: StreamService | null = null;
  private ready = false;

  init(config: ConfigService, prisma: PrismaService, stream: StreamService) {
    this.deviceId = config.get<string>('SELF_LOG_DEVICE_ID') ?? null;
    this.prisma = prisma;
    this.stream = stream;
    this.ready = !!this.deviceId;
    if (this.ready) {
      super.log(
        `SelfLogLogger active for device: ${this.deviceId}`,
        'SelfLogLogger',
      );
    }
  }

  override log(message: any, ...args: any[]) {
    super.log(message, ...args);
    this.persist('log', message, args);
  }

  override error(message: any, ...args: any[]) {
    super.error(message, ...args);
    this.persist('error', message, args);
  }

  override warn(message: any, ...args: any[]) {
    super.warn(message, ...args);
    this.persist('warn', message, args);
  }

  override debug(message: any, ...args: any[]) {
    super.debug(message, ...args);
    this.persist('debug', message, args);
  }

  override verbose(message: any, ...args: any[]) {
    super.verbose(message, ...args);
    this.persist('verbose', message, args);
  }

  override fatal(message: any, ...args: any[]) {
    super.fatal(message, ...args);
    this.persist('fatal', message, args);
  }

  private persist(nestLevel: string, message: any, args: any[]) {
    if (!this.ready || !this.deviceId || !this.prisma || !this.stream) return;

    const level = NEST_TO_IOT_LEVEL[nestLevel] ?? LogLevel.INFO;
    const context =
      typeof args[args.length - 1] === 'string'
        ? args[args.length - 1]
        : undefined;
    const text =
      typeof message === 'string' ? message : JSON.stringify(message);
    const deviceId = this.deviceId;

    this.prisma.logEntry
      .create({
        data: {
          deviceId,
          level,
          source: LogSourceType.HTTP,
          app: context ?? 'backend',
          host: 'localhost',
          message: text.slice(0, 2000),
          raw: context ? { context } : undefined,
        },
      })
      .then((log) => {
        // После сохранения — публикуем в SSE stream
        this.stream!.publishLog(deviceId, log);
      })
      .catch(() => {});
  }
}
