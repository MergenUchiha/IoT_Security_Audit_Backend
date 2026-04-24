import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import { MailService } from '../../common/mail/mail.service';

@Injectable()
export class ScheduledAuditService {
  private readonly logger = new Logger(ScheduledAuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  /**
   * Runs every minute. Checks which devices have scheduled audits
   * whose cron expression matches the current time.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledAudits() {
    const devices = await this.prisma.device.findMany({
      where: {
        scheduleEnabled: true,
        scheduleCron: { not: null },
        isActive: true,
      },
    });

    if (devices.length === 0) return;

    const now = new Date();

    for (const device of devices) {
      if (!device.scheduleCron) continue;
      if (!this.cronMatchesNow(device.scheduleCron, now)) continue;

      // Skip if already ran this minute
      if (
        device.scheduleLastRun &&
        now.getTime() - device.scheduleLastRun.getTime() < 60_000
      ) {
        continue;
      }

      this.logger.log(
        `Scheduled audit triggered for device "${device.name}" (${device.id})`,
      );

      // Mark last run immediately to prevent duplicates
      await this.prisma.device.update({
        where: { id: device.id },
        data: { scheduleLastRun: now },
      });

      // Run audit asynchronously
      this.runAndNotify(device).catch((err) => {
        this.logger.error(
          `Scheduled audit failed for ${device.name}: ${err.message}`,
        );
      });
    }
  }

  private async runAndNotify(device: {
    id: string;
    name: string;
    scheduleEmail: string | null;
  }) {
    const result = await this.audit.runDeviceAudit(device.id, { nmap: true });

    if (device.scheduleEmail && result.summary) {
      await this.mail.sendAuditReport(
        device.scheduleEmail,
        device.name,
        result.summary,
        result.auditRun.id,
      );
    }
  }

  /**
   * Simple cron matcher for "min hour dom month dow" format.
   * Supports: numbers, *, and step values (e.g. *\/5).
   */
  private cronMatchesNow(cron: string, now: Date): boolean {
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5) return false;

    const [minExpr, hourExpr, domExpr, monExpr, dowExpr] = parts;
    const minute = now.getMinutes();
    const hour = now.getHours();
    const dayOfMonth = now.getDate();
    const month = now.getMonth() + 1;
    const dayOfWeek = now.getDay(); // 0=Sunday

    return (
      this.fieldMatches(minExpr, minute, 0, 59) &&
      this.fieldMatches(hourExpr, hour, 0, 23) &&
      this.fieldMatches(domExpr, dayOfMonth, 1, 31) &&
      this.fieldMatches(monExpr, month, 1, 12) &&
      this.fieldMatches(dowExpr, dayOfWeek, 0, 6)
    );
  }

  private fieldMatches(
    expr: string,
    value: number,
    min: number,
    max: number,
  ): boolean {
    for (const part of expr.split(',')) {
      if (this.singleFieldMatches(part.trim(), value, min, max)) return true;
    }
    return false;
  }

  private singleFieldMatches(
    part: string,
    value: number,
    min: number,
    max: number,
  ): boolean {
    // Handle step: */5 or 1-10/2
    const [rangePart, stepStr] = part.split('/');
    const step = stepStr ? parseInt(stepStr, 10) : 1;

    if (rangePart === '*') {
      return (value - min) % step === 0;
    }

    // Handle range: 1-5
    if (rangePart.includes('-')) {
      const [startStr, endStr] = rangePart.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (value < start || value > end) return false;
      return (value - start) % step === 0;
    }

    // Exact value
    return parseInt(rangePart, 10) === value;
  }
}
