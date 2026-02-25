import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SummaryService } from './summary.service';

@ApiTags('summary')
@Controller()
export class SummaryController {
  constructor(private readonly summary: SummaryService) {}

  @Get('devices/:deviceId/summary')
  get(@Param('deviceId') deviceId: string) {
    return this.summary.getDeviceSummary(deviceId);
  }
}
