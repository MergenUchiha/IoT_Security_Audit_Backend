import { Injectable } from '@nestjs/common';
import { AlertType, Severity } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SurfaceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Сохраняем новый snapshot и сравниваем с предыдущим.
   * Если изменилось — создаём Alert(SURFACE_CHANGED).
   */
  async saveAndDetectSurfaceChange(
    deviceId: string,
    profile: any,
    auditRunId?: string,
  ) {
    const prev = await this.prisma.surfaceSnapshot.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });

    const isBaseline = !prev;
    const created = await this.prisma.surfaceSnapshot.create({
      data: {
        deviceId,
        profile,
        isBaseline,
      },
    });

    if (!prev) {
      return { changed: false, snapshot: created, diff: null };
    }

    const diff = diffSurface(prev.profile as any, profile);
    const changed = diff.added.length > 0 || diff.removed.length > 0;

    if (changed) {
      await this.prisma.alert.create({
        data: {
          deviceId,
          type: AlertType.SURFACE_CHANGED,
          severity: pickSeverity(diff),
          title: 'Attack surface changed',
          message: `Open ports/services changed: +${diff.added.length} / -${diff.removed.length}`,
          data: diff,
          auditRunId: auditRunId ?? null,
        },
      });
    }

    return { changed, snapshot: created, diff };
  }
}

function keyOf(p: any) {
  return `${p.port}/${p.proto}/${p.service ?? ''}/${p.product ?? ''}/${p.version ?? ''}`;
}

function diffSurface(prev: any, cur: any) {
  const prevPorts = (prev?.openPorts ?? []).map((p: any) => ({
    ...p,
    _k: keyOf(p),
  }));
  const curPorts = (cur?.openPorts ?? []).map((p: any) => ({
    ...p,
    _k: keyOf(p),
  }));

  const prevSet = new Set(prevPorts.map((p: any) => p._k));
  const curSet = new Set(curPorts.map((p: any) => p._k));

  const added = curPorts.filter((p: any) => !prevSet.has(p._k)).map(strip);
  const removed = prevPorts.filter((p: any) => !curSet.has(p._k)).map(strip);

  return { added, removed };
}

function strip(p: any) {
  const { _k, ...rest } = p;
  return rest;
}

function pickSeverity(diff: { added: any[]; removed: any[] }): Severity {
  // простое правило: если добавился telnet/ftp — выше
  const addedPorts = diff.added.map((p: any) => p.port);
  if (addedPorts.includes(23)) return Severity.CRITICAL;
  if (addedPorts.includes(21)) return Severity.HIGH;
  if (
    addedPorts.includes(80) ||
    addedPorts.includes(8080) ||
    addedPorts.includes(443)
  )
    return Severity.MEDIUM;
  return Severity.LOW;
}
