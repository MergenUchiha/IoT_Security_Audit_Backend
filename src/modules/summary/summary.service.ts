import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getDeviceSummary(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: {
        id: true,
        name: true,
        ip: true,
        hostname: true,
        type: true,
        isActive: true,
      },
    });

    if (!device) throw new NotFoundException('Device not found');

    // alerts counters
    const [alertsTotal, alertsUnacked] = await Promise.all([
      this.prisma.alert.count({ where: { deviceId } }),
      this.prisma.alert.count({ where: { deviceId, acknowledgedAt: null } }),
    ]);

    // last audit
    const lastAudit = await this.prisma.auditRun.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        finishedAt: true,
        summary: true,
      },
    });

    // last log timestamp
    const lastLog = await this.prisma.logEntry.findFirst({
      where: { deviceId },
      orderBy: { ts: 'desc' },
      select: { id: true, ts: true, level: true, source: true },
    });

    // last seen time = max(lastLog.ts, lastAudit.createdAt) удобно для UI
    const lastSeenCandidates: Date[] = [];
    if (lastLog?.ts) lastSeenCandidates.push(lastLog.ts);
    if (lastAudit?.createdAt) lastSeenCandidates.push(lastAudit.createdAt);
    const lastSeen = lastSeenCandidates.length
      ? new Date(Math.max(...lastSeenCandidates.map((d) => d.getTime())))
      : null;

    return {
      device,
      alerts: {
        total: alertsTotal,
        unacked: alertsUnacked,
      },
      lastAudit: lastAudit
        ? {
            id: lastAudit.id,
            status: lastAudit.status as AuditStatus,
            createdAt: lastAudit.createdAt,
            finishedAt: lastAudit.finishedAt,
            summary: lastAudit.summary,
          }
        : null,
      lastLog: lastLog
        ? {
            id: lastLog.id,
            ts: lastLog.ts,
            level: lastLog.level,
            source: lastLog.source,
          }
        : null,
      lastSeen,
    };
  }
}
