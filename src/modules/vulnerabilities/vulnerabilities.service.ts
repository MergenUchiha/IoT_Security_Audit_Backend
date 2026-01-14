import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VulnerabilitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(severity?: string, device?: string) {
    const where: any = {};

    if (severity) {
      where.severity = severity;
    }

    if (device) {
      where.deviceVulns = {
        some: {
          device: {
            name: {
              contains: device,
              mode: 'insensitive',
            },
          },
        },
      };
    }

    return await this.prisma.vulnerability.findMany({
      where,
      include: {
        deviceVulns: {
          include: {
            device: true,
          },
        },
      },
      orderBy: { cvss: 'desc' },
    });
  }

  async findOne(id: string) {
    const vulnerability = await this.prisma.vulnerability.findUnique({
      where: { id },
      include: {
        deviceVulns: {
          include: {
            device: true,
          },
        },
      },
    });

    if (!vulnerability) {
      throw new NotFoundException('Vulnerability not found');
    }

    return vulnerability;
  }

  async getStats() {
    const all = await this.prisma.vulnerability.findMany();

    return {
      total: all.length,
      critical: all.filter(v => v.severity === 'critical').length,
      high: all.filter(v => v.severity === 'high').length,
      medium: all.filter(v => v.severity === 'medium').length,
      low: all.filter(v => v.severity === 'low').length,
    };
  }
}