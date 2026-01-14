import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { IoTScannerService } from './iot-scanner.service';
import { StartScanDto } from './dto/scan.dto';

@Injectable()
export class ScansService {
  private activeScans = new Map<string, NodeJS.Timeout>();

  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private iotScanner: IoTScannerService,
  ) {}

  async start(dto: StartScanDto) {
    console.log('🔍 [SCANS] Starting simulated scan:', dto);

    const device = await this.prisma.device.findUnique({
      where: { id: dto.deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

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

    this.runSimulatedScan(scan.id, device);
    return scan;
  }

  /**
   * Start a real IoT device scan using nmap
   */
  async startRealScan(deviceId: string, ipAddress: string) {
    console.log('🔍 [SCANS] Starting REAL scan:', deviceId, ipAddress);

    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Check if nmap is available
    const hasNmap = await this.iotScanner.checkNmapInstalled();
    if (!hasNmap) {
      throw new Error('nmap is not installed. Please install: sudo apt install nmap');
    }

    const scan = await this.prisma.scan.create({
      data: {
        deviceId: deviceId,
        type: 'real-iot-scan',
        status: 'running',
        phases: {
          phases: [
            { phase: 'Initializing Scanner', progress: 0, status: 'running', time: '0s' },
            { phase: 'Network Discovery', progress: 0, status: 'pending', time: '-' },
            { phase: 'Port Scanning (nmap)', progress: 0, status: 'pending', time: '-' },
            { phase: 'Service Detection', progress: 0, status: 'pending', time: '-' },
            { phase: 'OS Fingerprinting', progress: 0, status: 'pending', time: '-' },
            { phase: 'Vulnerability Detection', progress: 0, status: 'pending', time: '-' },
            { phase: 'Analyzing Results', progress: 0, status: 'pending', time: '-' },
          ],
        },
      },
    });

    // Run real scan in background
    this.runRealScan(scan.id, device, ipAddress);
    return scan;
  }

  /**
   * Execute real IoT scan with nmap
   */
  private async runRealScan(scanId: string, device: any, ipAddress: string) {
    const phases = [
      'Initializing Scanner',
      'Network Discovery',
      'Port Scanning (nmap)',
      'Service Detection',
      'OS Fingerprinting',
      'Vulnerability Detection',
      'Analyzing Results',
    ];

    try {
      // Phase 1: Initialize
      await this.updateScanProgress(scanId, 0, 100);
      await this.sleep(1000);

      // Phase 2: Network Discovery
      await this.updateScanProgress(scanId, 1, 50);
      await this.sleep(2000);
      await this.updateScanProgress(scanId, 1, 100);

      // Phase 3-6: Run actual nmap scan
      await this.updateScanProgress(scanId, 2, 50);
      
      console.log('🔍 [SCANS] Running nmap scan on:', ipAddress);
      const scanResults = await this.iotScanner.scanDevice(ipAddress);
      
      await this.updateScanProgress(scanId, 2, 100);
      await this.updateScanProgress(scanId, 3, 100);
      await this.updateScanProgress(scanId, 4, 100);
      await this.updateScanProgress(scanId, 5, 100);

      // Phase 7: Analyze and store results
      await this.updateScanProgress(scanId, 6, 50);
      
      // Store vulnerabilities found
      for (const vuln of scanResults.vulnerabilities) {
        // Check if vulnerability exists in database
        let vulnerability = await this.prisma.vulnerability.findUnique({
          where: { id: vuln.id },
        });

        // Create if doesn't exist
        if (!vulnerability) {
          vulnerability = await this.prisma.vulnerability.create({
            data: {
              id: vuln.id,
              title: vuln.title,
              severity: vuln.severity,
              cvss: vuln.cvss,
              description: vuln.description,
              impact: 'Detected during automated scan',
              solution: 'Review vulnerability details and apply recommended fixes',
              discovered: new Date(),
            },
          });
        }

        // Link to device
        await this.prisma.deviceVulnerability.upsert({
          where: {
            deviceId_vulnerabilityId: {
              deviceId: device.id,
              vulnerabilityId: vulnerability.id,
            },
          },
          create: {
            deviceId: device.id,
            vulnerabilityId: vulnerability.id,
            status: 'open',
          },
          update: {
            detectedAt: new Date(),
          },
        });

        // Create scan finding
        await this.prisma.scanFinding.create({
          data: {
            scanId: scanId,
            vulnerabilityId: vulnerability.id,
            details: vuln.description,
          },
        });
      }

      // Update device information
      await this.prisma.device.update({
        where: { id: device.id },
        data: {
          ports: scanResults.ports.map(p => p.port),
          services: scanResults.ports.map(p => p.service),
          vulnerabilities: scanResults.vulnerabilities.length,
          lastScan: new Date(),
        },
      });

      await this.updateScanProgress(scanId, 6, 100);
      
      // Complete scan
      await this.completeScan(scanId, {
        portsFound: scanResults.ports.length,
        vulnerabilitiesFound: scanResults.vulnerabilities.length,
        osDetected: scanResults.os?.name,
      });

      console.log('✅ [SCANS] Real scan completed:', scanId);
      console.log(`   - Ports found: ${scanResults.ports.length}`);
      console.log(`   - Vulnerabilities: ${scanResults.vulnerabilities.length}`);
      
    } catch (error) {
      console.error('❌ [SCANS] Real scan failed:', error);
      await this.failScan(scanId, error.message);
    }
  }

  /**
   * Discover IoT devices on network
   */
  async discoverDevices(subnet: string = '192.168.1.0/24') {
    console.log('🔍 [SCANS] Discovering devices on:', subnet);
    
    try {
      const hosts = await this.iotScanner.discoverDevices(subnet);
      
      const devices:any = [];
      for (const host of hosts) {
        // Quick port scan to identify device type
        const openPorts = await this.iotScanner.quickPortScan(host);
        
        const deviceType = this.identifyDeviceType(openPorts);
        
        devices.push({
          ip: host,
          ports: openPorts,
          type: deviceType,
          discovered: new Date(),
        });
      }
      
      return {
        subnet,
        devicesFound: devices.length,
        devices,
      };
    } catch (error) {
      console.error('❌ [SCANS] Discovery failed:', error);
      throw error;
    }
  }

  /**
   * Identify device type based on open ports
   */
  private identifyDeviceType(ports: number[]): string {
    if (ports.includes(554) || ports.includes(8000)) return 'Camera';
    if (ports.includes(1883) || ports.includes(8883)) return 'IoT Sensor';
    if (ports.includes(8080) && ports.includes(443)) return 'Smart Hub';
    if (ports.includes(9999)) return 'IoT Device';
    if (ports.includes(22) && ports.includes(80)) return 'Router/Gateway';
    return 'Unknown Device';
  }

  /**
   * Run simulated scan (original functionality)
   */
  private async runSimulatedScan(scanId: string, device: any) {
    const phases = [
      'Network Discovery',
      'Port Scanning',
      'Service Detection',
      'Firmware Analysis',
      'Network Traffic Analysis',
      'CVE Matching',
    ];

    let currentPhaseIndex = 0;
    const totalPhases = phases.length;
    const phaseTime = 3000;

    const interval = setInterval(async () => {
      try {
        if (currentPhaseIndex >= totalPhases) {
          clearInterval(interval);
          await this.completeScan(scanId);
          this.activeScans.delete(scanId);
          return;
        }

        const progress = 100;
        await this.updateScanProgress(scanId, currentPhaseIndex, progress);
        currentPhaseIndex++;

      } catch (error) {
        console.error('❌ [SCANS] Error during scan:', error);
        clearInterval(interval);
        await this.failScan(scanId, error.message);
        this.activeScans.delete(scanId);
      }
    }, phaseTime);

    this.activeScans.set(scanId, interval);
  }

  private async updateScanProgress(scanId: string, phaseIndex: number, progress: number) {
    const scan = await this.prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) return;

    const phases = (scan.phases as any).phases;
    phases[phaseIndex].progress = progress;
    phases[phaseIndex].status = progress === 100 ? 'completed' : 'running';
    phases[phaseIndex].time = progress === 100 ? '3.0s' : '0s';

    if (progress === 100 && phaseIndex + 1 < phases.length) {
      phases[phaseIndex + 1].status = 'running';
      phases[phaseIndex + 1].progress = 0;
    }

    const updated = await this.prisma.scan.update({
      where: { id: scanId },
      data: { 
        phases: { phases },
        updatedAt: new Date(),
      },
    });

    this.events.broadcastScanUpdate(updated);
    this.events.emitScanProgress(scanId, scan.deviceId, progress, phases[phaseIndex].phase);
  }

  private async completeScan(scanId: string, metadata?: any) {
    const scan = await this.prisma.scan.findUnique({ 
      where: { id: scanId },
      include: { device: true, findings: true }
    });
    
    if (!scan) return;

    const phases = (scan.phases as any).phases;
    phases.forEach((phase: any) => {
      phase.progress = 100;
      phase.status = 'completed';
      if (phase.time === '-' || phase.time === '0s') {
        phase.time = '3.0s';
      }
    });

    const totalDuration = Math.floor((new Date().getTime() - new Date(scan.startTime).getTime()) / 1000);

    const completed = await this.prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'completed',
        endTime: new Date(),
        duration: totalDuration,
        phases: { phases },
      },
      include: { device: true, findings: { include: { vulnerability: true } } }
    });

    console.log('✅ [SCANS] Scan completed:', scanId);
    if (metadata) {
      console.log('   Metadata:', metadata);
    }
    
    this.events.emitScanCompleted(scanId, scan.deviceId, {
      scanId,
      deviceId: scan.deviceId,
      deviceName: scan.device.name,
      duration: totalDuration,
      vulnerabilitiesFound: completed.findings.length,
      status: 'completed',
      ...metadata
    });
    
    this.events.broadcastScanUpdate(completed);

    await this.prisma.device.update({
      where: { id: scan.deviceId },
      data: { lastScan: new Date() }
    });
  }

  private async failScan(scanId: string, errorMessage: string) {
    await this.prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'failed',
        endTime: new Date(),
      },
    });

    console.error('❌ [SCANS] Scan failed:', scanId, errorMessage);
    this.events.emitScanFailed(scanId, errorMessage);
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
        _count: {
          select: { findings: true }
        }
      },
      take: 50,
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}