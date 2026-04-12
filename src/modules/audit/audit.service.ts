import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditStatus, Severity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RunAuditDto } from './dto/run-audit.dto';
import { runNmap } from './runners/nmap.runner';
import {
  parseNmapXmlToFindings,
  toSurfaceProfile,
} from './parsers/nmap-xml.parser';
import { runNuclei } from './runners/nuclei.runner';
import { SurfaceService } from './surface/surface.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly surface: SurfaceService,
  ) {}

  async runDeviceAudit(deviceId: string, dto: RunAuditDto) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!device) throw new NotFoundException('Device not found');
    if (!device.ip && !device.hostname) {
      throw new NotFoundException('Device must have ip or hostname');
    }

    const targetHost = device.ip ?? device.hostname!;
    const runNmapScan = dto.nmap ?? true;
    const runNucleiScan = dto.nuclei ?? false;

    this.logger.log(
      `Audit started: device="${device.name}" host=${targetHost} nmap=${runNmapScan} nuclei=${runNucleiScan}`,
    );

    const run = await this.prisma.auditRun.create({
      data: {
        deviceId,
        status: AuditStatus.RUNNING,
        startedAt: new Date(),
        config: {
          nmap: runNmapScan,
          nuclei: runNucleiScan,
          targetHost,
          nucleiTargetUrl: dto.nucleiTargetUrl ?? null,
          nucleiArgs: dto.nucleiArgs ?? null,
        },
      },
    });

    const summary: any = {
      toolErrors: [],
      findings: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      surfaceChanged: false,
    };

    try {
      let surfaceProfile: any | null = null;

      // ─── 1) Nmap ───────────────────────────────────────────────────────────
      if (runNmapScan) {
        this.logger.log(`[nmap] scanning ${targetHost}...`);
        try {
          const xml = await runNmap(targetHost);
          const findings = parseNmapXmlToFindings(xml);
          surfaceProfile = toSurfaceProfile(xml);

          this.logger.log(
            `[nmap] done: ${findings.length} findings, open ports: ${
              surfaceProfile.openPorts
                .map((p: any) => `${p.port}/${p.proto}`)
                .join(', ') || 'none'
            }`,
          );

          if (findings.length > 0) {
            await this.prisma.auditFinding.createMany({
              data: findings.map((f) => ({
                auditRunId: run.id,
                title: f.title,
                severity: f.severity,
                kind: f.kind,
                port: f.port,
                protocol: f.protocol,
                service: f.service,
                cve: f.cve,
                description: f.description,
                evidence: f.evidence,
                remediation: f.remediation,
              })),
            });
          }

          if (surfaceProfile) {
            const { changed } = await this.surface.saveAndDetectSurfaceChange(
              deviceId,
              surfaceProfile,
              run.id,
            );
            summary.surfaceChanged = changed;
            if (changed)
              this.logger.warn(
                `[nmap] attack surface CHANGED for ${targetHost}`,
              );
          }
        } catch (nmapErr: any) {
          const msg = String(nmapErr?.message ?? nmapErr);
          this.logger.error(`[nmap] failed: ${msg}`);
          summary.toolErrors.push({ tool: 'nmap', error: msg });

          if (msg.includes('ENOENT') || msg.includes('not found')) {
            await this.prisma.auditFinding.create({
              data: {
                auditRunId: run.id,
                title: 'nmap not installed',
                severity: Severity.INFO,
                kind: 'tool_missing',
                description:
                  process.platform === 'win32'
                    ? 'Install nmap: https://nmap.org/download.html'
                    : process.platform === 'darwin'
                      ? 'Install nmap: brew install nmap'
                      : 'Install nmap: sudo apt install nmap',
                remediation:
                  process.platform === 'win32'
                    ? 'Place nmap.exe in C:\\Program Files (x86)\\Nmap\\ or add to PATH'
                    : 'Ensure nmap is available in PATH',
              },
            });
          }
        }
      }

      // ─── 2) Nuclei ─────────────────────────────────────────────────────────
      if (runNucleiScan) {
        // Приоритет: явно указанный URL > угадываем по профилю nmap
        const targetUrl =
          dto.nucleiTargetUrl?.trim() || guessUrl(targetHost, surfaceProfile);

        this.logger.log(`[nuclei] scanning ${targetUrl}...`);
        this.logger.log(
          `[nuclei] note: first run downloads templates (~500MB), may take 5-10 min`,
        );

        const nucleiRes = await runNuclei(targetUrl, dto.nucleiArgs);

        if (nucleiRes.error) {
          this.logger.warn(`[nuclei] error: ${nucleiRes.error}`);
          summary.toolErrors.push({ tool: 'nuclei', error: nucleiRes.error });

          // Если nuclei не найден — добавить INFO находку
          if (
            nucleiRes.error.includes('not found') ||
            nucleiRes.error.includes('ENOENT')
          ) {
            await this.prisma.auditFinding.create({
              data: {
                auditRunId: run.id,
                title: 'nuclei not installed',
                severity: Severity.INFO,
                kind: 'tool_missing',
                description:
                  process.platform === 'win32'
                    ? 'Download nuclei from https://github.com/projectdiscovery/nuclei/releases and place nuclei.exe in PATH'
                    : process.platform === 'darwin'
                      ? 'Install nuclei: brew install nuclei'
                      : 'Install nuclei: go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
                remediation:
                  'Install nuclei to enable web vulnerability scanning.',
              },
            });
          }
        } else {
          this.logger.log(
            `[nuclei] done: ${nucleiRes.findings.length} findings on ${targetUrl}`,
          );
          if (nucleiRes.findings.length > 0) {
            await this.prisma.auditFinding.createMany({
              data: nucleiRes.findings.map((f) => ({
                auditRunId: run.id,
                title: f.title,
                severity: f.severity,
                kind: f.kind,
                description: f.description,
                evidence: f.evidence,
                remediation: f.remediation,
              })),
            });
          }
        }
      }

      // ─── Агрегируем summary ────────────────────────────────────────────────
      const counts = await this.prisma.auditFinding.groupBy({
        by: ['severity'],
        where: { auditRunId: run.id },
        _count: { severity: true },
      });

      for (const row of counts) {
        const c = row._count.severity;
        summary.findings.total += c;
        const s = row.severity;
        if (s === 'CRITICAL') summary.findings.critical += c;
        else if (s === 'HIGH') summary.findings.high += c;
        else if (s === 'MEDIUM') summary.findings.medium += c;
        else if (s === 'LOW') summary.findings.low += c;
        else summary.findings.info += c;
      }

      // SUCCESS если есть хоть какие-то находки или инструменты отработали без краша
      const status =
        summary.toolErrors.length > 0 && summary.findings.total === 0
          ? AuditStatus.FAILED
          : AuditStatus.SUCCESS;

      this.logger.log(
        `Audit ${run.id} DONE: status=${status} | ` +
          `findings: critical=${summary.findings.critical} high=${summary.findings.high} ` +
          `medium=${summary.findings.medium} low=${summary.findings.low} info=${summary.findings.info} | ` +
          `errors: ${summary.toolErrors.length}`,
      );

      const finished = await this.prisma.auditRun.update({
        where: { id: run.id },
        data: { status, finishedAt: new Date(), summary },
      });

      return { auditRun: finished, summary };
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      this.logger.error(`Audit ${run.id} CRASHED: ${msg}`);
      summary.toolErrors.push({ tool: 'audit', error: msg });

      const failed = await this.prisma.auditRun.update({
        where: { id: run.id },
        data: { status: AuditStatus.FAILED, finishedAt: new Date(), summary },
      });

      return { auditRun: failed, summary };
    }
  }

  listDeviceAudits(deviceId: string) {
    return this.prisma.auditRun.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  getAuditRun(auditRunId: string) {
    return this.prisma.auditRun.findUnique({
      where: { id: auditRunId },
      include: {
        findings: {
          orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        },
        device: true,
      },
    });
  }
}

function guessUrl(host: string, surfaceProfile: any | null): string {
  const ports = surfaceProfile?.openPorts ?? [];
  const has443 = ports.some(
    (p: any) => p.port === 443 && String(p.proto).toLowerCase() === 'tcp',
  );
  const has80 = ports.some(
    (p: any) => p.port === 80 && String(p.proto).toLowerCase() === 'tcp',
  );
  if (has443) return `https://${host}`;
  if (has80) return `http://${host}`;
  return `http://${host}`;
}
