import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeviceDto, UpdateDeviceDto } from './dto/device.dto';

@Injectable()
export class DevicesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDeviceDto) {
    // Check if device with same IP already exists
    const existing = await this.prisma.device.findUnique({
      where: { ip: dto.ip },
    });

    if (existing) {
      throw new ConflictException(`Device with IP ${dto.ip} already exists`);
    }

    const device = await this.prisma.device.create({
      data: {
        ...dto,
        status: dto.status || 'online',
        risk: dto.risk || 'medium',
      },
    });

    console.log('✅ [DEVICES] Created device:', device.name);
    return device;
  }

  async findAll() {
    const devices = await this.prisma.device.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { deviceVulns: true },
        },
      },
    });

    console.log(`📊 [DEVICES] Found ${devices.length} devices`);
    
    return devices.map(device => ({
      ...device,
      vulnerabilities: device._count.deviceVulns,
    }));
  }

  async findOne(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        deviceVulns: {
          include: {
            vulnerability: true,
          },
        },
        scans: {
          orderBy: { startTime: 'desc' },
          take: 5,
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    console.log(`🔍 [DEVICES] Retrieved device: ${device.name}`);
    return device;
  }

  async update(id: string, dto: UpdateDeviceDto) {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const updated = await this.prisma.device.update({
      where: { id },
      data: dto,
    });

    console.log(`✏️  [DEVICES] Updated device: ${updated.name}`);
    return updated;
  }

  async delete(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.prisma.device.delete({
      where: { id },
    });

    console.log(`🗑️  [DEVICES] Deleted device: ${device.name}`);
    return { message: 'Device deleted successfully', device };
  }

  async getVulnerabilities(id: string) {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        deviceVulns: {
          include: {
            vulnerability: true,
          },
        },
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const vulnerabilities = device.deviceVulns.map(dv => ({
      ...dv.vulnerability,
      status: dv.status,
      detectedAt: dv.detectedAt,
    }));

    console.log(`🛡️  [DEVICES] Retrieved ${vulnerabilities.length} vulnerabilities for ${device.name}`);
    return vulnerabilities;
  }
}