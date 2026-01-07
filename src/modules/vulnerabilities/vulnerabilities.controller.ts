import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { VulnerabilitiesService } from './vulnerabilities.service';

@ApiTags('vulnerabilities')
@Controller('vulnerabilities')
export class VulnerabilitiesController {
  constructor(private readonly vulnerabilitiesService: VulnerabilitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all vulnerabilities' })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'device', required: false })
  findAll(@Query('severity') severity?: string, @Query('device') device?: string) {
    return this.vulnerabilitiesService.findAll(severity, device);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vulnerability by ID' })
  findOne(@Param('id') id: string) {
    return this.vulnerabilitiesService.findOne(id);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get vulnerability statistics' })
  getStats() {
    return this.vulnerabilitiesService.getStats();
  }
}