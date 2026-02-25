import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus, LogSourceType, Severity } from '@prisma/client';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly surface: SurfaceService,
  ) {}

  async runDeviceAudit(deviceId: string, dto: RunAuditDto) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!device) throw new NotFoundException('Device not found');
    if (!device.ip && !device.hostname)
      throw new NotFoundException('Device must have ip or hostname');

    const targetHost = device.ip ?? device.hostname!;
    const run = await this.prisma.auditRun.create({
      data: {
        deviceId,
        status: AuditStatus.RUNNING,
        startedAt: new Date(),
        config: {
          nmap: dto.nmap ?? true,
          nuclei: dto.nuclei ?? true,
          targetHost,
          nucleiTargetUrl: dto.nucleiTargetUrl ?? null,
        },
      },
    });

    const summary: any = {
      toolErrors: [],
      findings: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      surfaceChanged: false,
    };

    try {
      // 1) Nmap
      let surfaceProfile: any | null = null;

      if (dto.nmap ?? true) {
        const xml = await runNmap(targetHost);
        const findings = parseNmapXmlToFindings(xml);
        surfaceProfile = toSurfaceProfile(xml);

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

        // surface snapshot + diff alert
        if (surfaceProfile) {
          const { changed } = await this.surface.saveAndDetectSurfaceChange(
            deviceId,
            surfaceProfile,
            run.id,
          );
          summary.surfaceChanged = changed;
        }
      }

      // 2) Nuclei (опционально; если binary нет — просто пишем toolErrors и идём дальше)
      if (dto.nuclei ?? true) {
        const targetUrl =
          dto.nucleiTargetUrl ?? guessUrl(targetHost, surfaceProfile);
        const nucleiRes = await runNuclei(targetUrl, dto.nucleiArgs);

        if (nucleiRes.error) {
          summary.toolErrors.push({ tool: 'nuclei', error: nucleiRes.error });
        } else if (nucleiRes.findings.length) {
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

      // агрегируем summary по фактическим findings из БД (надёжнее)
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

      const finished = await this.prisma.auditRun.update({
        where: { id: run.id },
        data: {
          status: AuditStatus.SUCCESS,
          finishedAt: new Date(),
          summary,
        },
      });

      return { auditRun: finished, summary };
    } catch (e: any) {
      summary.toolErrors.push({
        tool: 'audit',
        error: String(e?.message ?? e),
      });

      const failed = await this.prisma.auditRun.update({
        where: { id: run.id },
        data: {
          status: AuditStatus.FAILED,
          finishedAt: new Date(),
          summary,
        },
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
  // Пытаемся угадать http/https по профилю Nmap.
  // Если профиля нет — просто http.
  const ports = surfaceProfile?.openPorts ?? [];
  const has443 = ports.some(
    (p: any) => p.port === 443 && String(p.proto).toLowerCase() === 'tcp',
  );
  return has443 ? `https://${host}` : `http://${host}`;
}
