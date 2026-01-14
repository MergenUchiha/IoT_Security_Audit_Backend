import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generate(type: 'technical' | 'executive' | 'compliance') {
    const devices = await this.prisma.device.count();
    const vulnerabilities = await this.prisma.vulnerability.count();

    const report = await this.prisma.report.create({
      data: {
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${new Date().toLocaleDateString()}`,
        type,
        status: 'final',
        devices,
        vulnerabilities,
        findings: {
          summary: `Generated ${type} report with ${vulnerabilities} vulnerabilities across ${devices} devices`,
        },
      },
    });

    console.log('📄 [REPORTS] Generated report:', report.id);
    return report;
  }

  async findAll() {
    return await this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }
}