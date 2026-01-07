import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new report' })
  generate(@Body() dto: { type: 'technical' | 'executive' | 'compliance' }) {
    return this.reportsService.generate(dto.type);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reports' })
  findAll() {
    return this.reportsService.findAll();
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export report' })
  export() {
    return { message: 'Export functionality to be implemented' };
  }
}