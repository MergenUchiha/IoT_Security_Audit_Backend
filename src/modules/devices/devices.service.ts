import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateDeviceDto) {
    return this.prisma.device.create({
      data: {
        name: dto.name,
        ip: dto.ip,
        hostname: dto.hostname,
        type: dto.type,
        logSourceType: dto.logSourceType,
        logSourceMeta: dto.logSourceMeta,
      },
    });
  }

  list() {
    return this.prisma.device.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto) {
    await this.get(id);
    return this.prisma.device.update({
      where: { id },
      data: {
        name: dto.name,
        ip: dto.ip,
        hostname: dto.hostname,
        type: dto.type,
        logSourceType: dto.logSourceType,
        logSourceMeta: dto.logSourceMeta,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.device.delete({ where: { id } });
  }
}
