import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertType, Severity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  listForDevice(
    deviceId: string,
    params: {
      type?: AlertType;
      severity?: Severity;
      unacked?: boolean;
      limit: number;
    },
  ) {
    return this.prisma.alert.findMany({
      where: {
        deviceId,
        type: params.type,
        severity: params.severity,
        acknowledgedAt: params.unacked ? null : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit,
    });
  }

  async ack(alertId: string, note?: string) {
    const existing = await this.prisma.alert.findUnique({
      where: { id: alertId },
    });
    if (!existing) throw new NotFoundException('Alert not found');

    return this.prisma.alert.update({
      where: { id: alertId },
      data: {
        acknowledgedAt: new Date(),
        data: note
          ? { ...(existing.data as any), ackNote: note }
          : existing.data,
      },
    });
  }
}
