import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post()
  create(@Body() dto: CreateDeviceDto) {
    return this.devices.create(dto);
  }

  @Get()
  list() {
    return this.devices.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.devices.get(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    return this.devices.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.devices.remove(id);
  }
}