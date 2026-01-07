import { Controller, Get, Post, Put, Delete, Body, Param, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto, UpdateDeviceDto } from './dto/device.dto';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new device' })
  @ApiResponse({ status: 201, description: 'Device created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiBody({ type: CreateDeviceDto })
  create(@Body(ValidationPipe) dto: CreateDeviceDto) {
    return this.devicesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all devices' })
  @ApiResponse({ status: 200, description: 'Devices list retrieved' })
  findAll() {
    return this.devicesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device by ID' })
  @ApiResponse({ status: 200, description: 'Device details retrieved' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update device by ID' })
  @ApiResponse({ status: 200, description: 'Device updated successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiBody({ type: UpdateDeviceDto })
  update(@Param('id') id: string, @Body(ValidationPipe) dto: UpdateDeviceDto) {
    return this.devicesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete device by ID' })
  @ApiResponse({ status: 200, description: 'Device deleted successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  delete(@Param('id') id: string) {
    return this.devicesService.delete(id);
  }

  @Get(':id/vulnerabilities')
  @ApiOperation({ summary: 'Get device vulnerabilities' })
  @ApiResponse({ status: 200, description: 'Device vulnerabilities retrieved' })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  getVulnerabilities(@Param('id') id: string) {
    return this.devicesService.getVulnerabilities(id);
  }
}