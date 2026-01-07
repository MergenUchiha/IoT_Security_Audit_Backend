import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics' })
  getDashboard() {
    return this.analyticsService.getDashboard();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get security metrics' })
  getMetrics() {
    return this.analyticsService.getMetrics();
  }

  @Get('traffic')
  @ApiOperation({ summary: 'Get network traffic data' })
  getTraffic() {
    return this.analyticsService.getTraffic();
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get vulnerability trends' })
  getTrends() {
    return this.analyticsService.getTrends();
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent activity' })
  getActivity() {
    return this.analyticsService.getActivity();
  }
}