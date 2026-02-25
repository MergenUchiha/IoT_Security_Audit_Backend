import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { RunAuditDto } from './dto/run-audit.dto';

@ApiTags('audit')
@Controller()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

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
}
