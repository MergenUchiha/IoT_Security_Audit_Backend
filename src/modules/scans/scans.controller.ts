import { Controller, Get, Post, Param, Body, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ScansService } from './scans.service';
import { StartScanDto } from './dto/scan.dto';

@ApiTags('scans')
@Controller('scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a new security scan' })
  @ApiResponse({ status: 201, description: 'Scan started successfully' })
  @ApiBody({ type: StartScanDto })
  start(@Body(ValidationPipe) dto: StartScanDto) {
    return this.scansService.start(dto);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop a running scan' })
  @ApiResponse({ status: 200, description: 'Scan stopped' })
  stop(@Param('id') id: string) {
    return this.scansService.stop(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all scans' })
  @ApiResponse({ status: 200, description: 'Scans list retrieved' })
  findAll() {
    return this.scansService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scan by ID' })
  @ApiResponse({ status: 200, description: 'Scan details retrieved' })
  findOne(@Param('id') id: string) {
    return this.scansService.findOne(id);
  }
}