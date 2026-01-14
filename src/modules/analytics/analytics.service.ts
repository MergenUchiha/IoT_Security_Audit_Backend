import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    try {
      const [devices, vulnerabilities, metrics] = await Promise.all([
        this.prisma.device.findMany(),
        this.prisma.vulnerability.findMany(),
        this.prisma.securityMetrics.findFirst({
          orderBy: { timestamp: 'desc' },
        }),
      ]);

      const devicesOnline = devices.filter(d => d.status === 'online').length;
      const totalDevices = devices.length;
      const totalVulnerabilities = vulnerabilities.length;
      const criticalIssues = vulnerabilities.filter(v => v.severity === 'critical').length;

      return {
        devicesOnline,
        totalDevices,
        totalVulnerabilities,
        criticalIssues,
        metrics: metrics || {},
      };
    } catch (error) {
      console.error('Error in getDashboard:', error);
      throw error;
    }
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
      orderBy: [{ year: 'desc' }, { month: 'asc' }],
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