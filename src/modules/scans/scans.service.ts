import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { StartScanDto } from './dto/scan.dto';

@Injectable()
export class ScansService {
  private activeScans = new Map<string, NodeJS.Timeout>();

  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  async start(dto: StartScanDto) {
    console.log('🔍 [SCANS] Starting scan:', dto);

    // Verify device exists
    const device = await this.prisma.device.findUnique({
      where: { id: dto.deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Create scan record
    const scan = await this.prisma.scan.create({
      data: {
        deviceId: dto.deviceId,
        type: dto.type,
        status: 'running',
        phases: {
          phases: [
            { phase: 'Network Discovery', progress: 0, status: 'running', time: '0s' },
            { phase: 'Port Scanning', progress: 0, status: 'pending', time: '-' },
            { phase: 'Service Detection', progress: 0, status: 'pending', time: '-' },
            { phase: 'Firmware Analysis', progress: 0, status: 'pending', time: '-' },
            { phase: 'Network Traffic Analysis', progress: 0, status: 'pending', time: '-' },
            { phase: 'CVE Matching', progress: 0, status: 'pending', time: '-' },
          ],
        },
      },
    });

    // Start scan simulation
    this.runScan(scan.id, device);

    return scan;
  }

  private async runScan(scanId: string, device: any) {
    const phases = [
      'Network Discovery',
      'Port Scanning',
      'Service Detection',
      'Firmware Analysis',
      'Network Traffic Analysis',
      'CVE Matching',
    ];

    let currentPhase = 0;

    const interval = setInterval(async () => {
      if (currentPhase >= phases.length) {
        clearInterval(interval);
        await this.completeScan(scanId);
        this.activeScans.delete(scanId);
        return;
      }

      // Simulate phase progress
      const progress = Math.min(100, (currentPhase + 1) * 20);
      
      await this.updateScanProgress(scanId, currentPhase, progress);
      
      currentPhase++;
    }, 3000); // 3 seconds per phase

    this.activeScans.set(scanId, interval);
  }

  private async updateScanProgress(scanId: string, phaseIndex: number, progress: number) {
    const scan = await this.prisma.scan.findUnique({ where: { id: scanId } });
    
    if (!scan) return;

    const phases = (scan.phases as any).phases;
    phases[phaseIndex].progress = progress;
    phases[phaseIndex].status = progress === 100 ? 'completed' : 'running';

    const updated = await this.prisma.scan.update({
      where: { id: scanId },
      data: { phases: { phases } },
    });

    this.events.broadcastScanUpdate(updated);
  }

  private async completeScan(scanId: string) {
    const scan = await this.prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'completed',
        endTime: new Date(),
        duration: 18, // 6 phases * 3 seconds
      },
    });

    console.log('✅ [SCANS] Scan completed:', scanId);
    this.events.broadcastScanUpdate(scan);
  }

  async stop(id: string) {
    if (this.activeScans.has(id)) {
      clearInterval(this.activeScans.get(id));
      this.activeScans.delete(id);
    }

    const scan = await this.prisma.scan.update({
      where: { id },
      data: {
        status: 'completed',
        endTime: new Date(),
      },
    });

    console.log('🛑 [SCANS] Scan stopped:', id);
    return scan;
  }

  async findAll() {
    return await this.prisma.scan.findMany({
      orderBy: { startTime: 'desc' },
      include: {
        device: true,
      },
      take: 20,
    });
  }

  async findOne(id: string) {
    const scan = await this.prisma.scan.findUnique({
      where: { id },
      include: {
        device: true,
        findings: {
          include: {
            vulnerability: true,
          },
        },
      },
    });

    if (!scan) {
      throw new NotFoundException('Scan not found');
    }

    return scan;
  }
}