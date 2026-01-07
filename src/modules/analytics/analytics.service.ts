import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const devices = await this.prisma.device.findMany();
    const vulnerabilities = await this.prisma.vulnerability.findMany();
    const metrics = await this.prisma.securityMetrics.findFirst({
      orderBy: { timestamp: 'desc' },
    });

    return {
      devicesOnline: devices.filter(d => d.status === 'online').length,
      totalDevices: devices.length,
      totalVulnerabilities: vulnerabilities.length,
      criticalIssues: vulnerabilities.filter(v => v.severity === 'critical').length,
      metrics: metrics || {},
    };
  }

  async getMetrics() {
    return await this.prisma.securityMetrics.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10,
    });
  }

  async getTraffic() {
    return await this.prisma.networkTraffic.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20,
    });
  }

  async getTrends() {
    return await this.prisma.vulnerabilityTrend.findMany({
      orderBy: { year: 'desc' },
      take: 12,
    });
  }

  async getActivity() {
    return await this.prisma.activityLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 20,
    });
  }
}