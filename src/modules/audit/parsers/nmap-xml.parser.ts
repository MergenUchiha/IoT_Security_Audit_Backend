import { XMLParser } from 'fast-xml-parser';
import { Severity } from '@prisma/client';

type Finding = {
  title: string;
  severity: Severity;
  kind: string;
  port?: number;
  protocol?: string;
  service?: string;
  cve?: string | null;
  description?: string | null;
  evidence?: any;
  remediation?: string | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

export function parseNmapXmlToFindings(xml: string): Finding[] {
  const doc = parser.parse(xml);
  const host = doc?.nmaprun?.host;
  if (!host) return [];

  const ports = normalizeArray(host?.ports?.port);
  const findings: Finding[] = [];

  for (const p of ports) {
    const state = p?.state?.state;
    if (state !== 'open') continue;

    const portid = toInt(p?.portid);
    const proto = String(p?.protocol ?? '').toLowerCase() || 'tcp';
    const svcName = p?.service?.name ? String(p.service.name) : undefined;
    const product = p?.service?.product ? String(p.service.product) : '';
    const version = p?.service?.version ? String(p.service.version) : '';
    const extrainfo = p?.service?.extrainfo ? String(p.service.extrainfo) : '';

    const svcLabel = [svcName, product, version, extrainfo]
      .filter(Boolean)
      .join(' ')
      .trim();

    findings.push({
      title: `Open port ${portid}/${proto}${svcLabel ? ` (${svcLabel})` : ''}`,
      severity: portSeverity(portid, svcName),
      kind: 'open_port',
      port: portid,
      protocol: proto,
      service: svcName,
      description: `Detected open port ${portid}/${proto} ${svcLabel}`.trim(),
      evidence: { service: p?.service ?? null, state: p?.state ?? null },
      remediation: `Close ${portid}/${proto} if not needed; restrict access by firewall/VLAN; disable unused services.`,
    });
  }

  return findings;
}

/**
 * Surface profile (для SurfaceSnapshot):
 * { openPorts: [{ port, proto, service, product, version, extrainfo }] }
 */
type SurfacePort = {
  port: number;
  proto: string;
  service: string | null;
  product: string | null;
  version: string | null;
  extrainfo: string | null;
};

export function toSurfaceProfile(xml: string): { openPorts: SurfacePort[] } {
  const doc = parser.parse(xml);
  const host = doc?.nmaprun?.host;
  if (!host) return { openPorts: [] };

  const ports = normalizeArray(host?.ports?.port);

  const openPorts: SurfacePort[] = [];

  for (const p of ports) {
    const state = p?.state?.state;
    if (state !== 'open') continue;

    openPorts.push({
      port: toInt(p?.portid),
      proto: String(p?.protocol ?? '').toLowerCase() || 'tcp',
      service: p?.service?.name ?? null,
      product: p?.service?.product ?? null,
      version: p?.service?.version ?? null,
      extrainfo: p?.service?.extrainfo ?? null,
    });
  }

  openPorts.sort((a, b) => a.port - b.port || a.proto.localeCompare(b.proto));
  return { openPorts };
}

function normalizeArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function toInt(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function portSeverity(port: number, svc?: string): Severity {
  const s = (svc ?? '').toLowerCase();
  if (port === 23 || s.includes('telnet')) return Severity.CRITICAL;
  if (port === 21 || s.includes('ftp')) return Severity.HIGH;
  if (port === 80 || port === 8080 || s.includes('http'))
    return Severity.MEDIUM;
  if (port === 22 || s.includes('ssh')) return Severity.LOW;
  return Severity.INFO;
}
