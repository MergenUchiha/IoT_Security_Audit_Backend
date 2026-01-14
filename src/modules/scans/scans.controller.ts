import { Controller, Get, Post, Param, Body, ValidationPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
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

  @Post('real-scan')
  @ApiOperation({ summary: 'Start a real IoT device scan using nmap' })
  @ApiResponse({ status: 201, description: 'Real scan started' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', description: 'Device ID' },
        ipAddress: { type: 'string', description: 'IP address to scan' }
      }
    }
  })
  async startRealScan(@Body() dto: { deviceId: string; ipAddress: string }) {
    return this.scansService.startRealScan(dto.deviceId, dto.ipAddress);
  }

  @Get('discover')
  @ApiOperation({ summary: 'Discover IoT devices on the network' })
  @ApiQuery({ name: 'subnet', required: false, example: '192.168.1.0/24' })
  @ApiResponse({ status: 200, description: 'Devices discovered' })
  async discoverDevices(@Query('subnet') subnet?: string) {
    return this.scansService.discoverDevices(subnet);
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