import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import dgram from 'node:dgram';
import { LogSourceType } from '@prisma/client';
import { parseSyslogLine } from './syslog.parser';
import { normalizeLevel } from '../../common/utils/log-level.util';
import { LogsService } from 'src/modules/logs/logs.service';
import { PrismaService } from 'src/modules/prisma/prisma.service';

@Injectable()
export class SyslogUdpService implements OnModuleInit, OnModuleDestroy {
  private server?: dgram.Socket;

  constructor(
    private readonly config: ConfigService,
    private readonly logs: LogsService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const enabled =
      String(this.config.get('SYSLOG_UDP_ENABLED') ?? 'true') === 'true';
    if (!enabled) return;

    const port = Number(this.config.get('SYSLOG_UDP_PORT') ?? 5514);
    this.server = dgram.createSocket('udp4');

    this.server.on('error', (err) => {
      console.error('[SYSLOG][UDP] error', err);
    });

    this.server.on('message', async (msg, rinfo) => {
      const line = msg.toString('utf-8').trim();
      if (!line) return;

      // Маппинг device по IP отправителя — самый универсальный вариант
      const device = await this.findDeviceByIp(rinfo.address);
      if (!device) {
        // можно логировать “unknown device”, но не спамить БД
        return;
      }

      const parsed = parseSyslogLine(line);
      await this.logs.create(device.id, {
        source: LogSourceType.SYSLOG,
        level: normalizeLevel(undefined),
        host: parsed.host ?? device.hostname ?? rinfo.address,
        app: parsed.app ?? undefined,
        message: parsed.message,
        raw: { ...parsed.raw, from: rinfo.address, port: rinfo.port },
      });
    });

    this.server.bind(port, '0.0.0.0', () => {
      console.log(`[SYSLOG][UDP] listening on 0.0.0.0:${port}`);
    });
  }

  async onModuleDestroy() {
    await new Promise<void>((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => resolve());
    });
  }

  private async findDeviceByIp(ip: string) {
    return this.prisma.device.findFirst({
      where: { ip, isActive: true },
    });
  }
}
