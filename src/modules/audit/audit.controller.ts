import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { RunAuditDto } from './dto/run-audit.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../../common/mail/mail.service';

@ApiTags('audit')
@Controller()
export class AuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // Запуск аудита устройства
  @Post('devices/:deviceId/audits/run')
  run(@Param('deviceId') deviceId: string, @Body() dto: RunAuditDto) {
    return this.audit.runDeviceAudit(deviceId, dto);
  }

  // История запусков по устройству
  @Get('devices/:deviceId/audits')
  list(@Param('deviceId') deviceId: string) {
    return this.audit.listDeviceAudits(deviceId);
  }

  // Детали конкретного запуска
  @Get('audits/:auditRunId')
  get(@Param('auditRunId') auditRunId: string) {
    return this.audit.getAuditRun(auditRunId);
  }

  // Get schedule settings for a device
  @Get('devices/:deviceId/schedule')
  async getSchedule(@Param('deviceId') deviceId: string) {
    const device = await this.prisma.device.findUniqueOrThrow({
      where: { id: deviceId },
      select: {
        id: true,
        scheduleEnabled: true,
        scheduleCron: true,
        scheduleEmail: true,
        scheduleLastRun: true,
      },
    });
    return {
      ...device,
      mailConfigured: this.mail.isConfigured,
    };
  }

  // Update schedule settings for a device
  @Patch('devices/:deviceId/schedule')
  async updateSchedule(
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    const device = await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        scheduleEnabled: dto.scheduleEnabled,
        scheduleCron: dto.scheduleCron,
        scheduleEmail: dto.scheduleEmail,
      },
      select: {
        id: true,
        scheduleEnabled: true,
        scheduleCron: true,
        scheduleEmail: true,
        scheduleLastRun: true,
      },
    });
    return {
      ...device,
      mailConfigured: this.mail.isConfigured,
    };
  }

  // Send test email
  @Post('devices/:deviceId/schedule/test-email')
  async testEmail(@Param('deviceId') deviceId: string) {
    const device = await this.prisma.device.findUniqueOrThrow({
      where: { id: deviceId },
      select: { name: true, scheduleEmail: true },
    });

    if (!device.scheduleEmail) {
      return { success: false, error: 'No email configured' };
    }

    if (!this.mail.isConfigured) {
      return { success: false, error: 'SMTP not configured on server' };
    }

    await this.mail.sendAuditReport(
      device.scheduleEmail,
      device.name,
      {
        findings: {
          total: 5,
          critical: 1,
          high: 2,
          medium: 1,
          low: 0,
          info: 1,
        },
        toolErrors: [],
        surfaceChanged: false,
      },
      'test-run-id',
    );

    return { success: true };
  }
}
