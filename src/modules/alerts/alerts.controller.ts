import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { AlertsQueryDto } from './dto/alerts-query.dto';
import { AckAlertDto } from './dto/ack-alert.dto';

@ApiTags('alerts')
@Controller()
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get('devices/:deviceId/alerts')
  list(@Param('deviceId') deviceId: string, @Query() q: AlertsQueryDto) {
    const unacked = String(q.unacked ?? 'false').toLowerCase() === 'true';
    return this.alerts.listForDevice(deviceId, {
      type: q.type,
      severity: q.severity,
      unacked,
      limit: q.limit ?? 100,
    });
  }

  @Patch('alerts/:alertId/ack')
  ack(@Param('alertId') alertId: string, @Body() dto: AckAlertDto) {
    return this.alerts.ack(alertId, dto.note);
  }
}
