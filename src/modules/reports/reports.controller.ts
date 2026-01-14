import { Controller, Get, Post, Body, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
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

  @Get(':id')
  @ApiOperation({ summary: 'Get report by ID' })
  findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download report as PDF' })
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    // For now, return a simple response
    // In production, you would generate actual PDF here
    res.status(200).json({ 
      message: 'PDF generation not yet implemented',
      reportId: id 
    });
  }
}