/* prisma/seed.ts */
import {
  PrismaClient,
  Prisma,
  DeviceType,
  LogSourceType,
  LogLevel,
  AuditStatus,
  Severity,
  AlertType,
  type Device,
} from '@prisma/client';

import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

let faker: any;
async function ensureFaker() {
  if (!faker) {
    const mod = await import('@faker-js/faker');
    faker = mod.faker;
  }
}

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.trim()) {
    throw new Error(
      'DATABASE_URL is missing. Make sure you have it in .env and that `prisma db seed` loads it.',
    );
  }
  return url;
}

// ✅ Prisma Client via Driver Adapter (required in your setup)
const pool = new Pool({ connectionString: getDatabaseUrl() });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDeviceType(): DeviceType {
  return pick([
    DeviceType.ROUTER,
    DeviceType.CAMERA,
    DeviceType.IOT,
    DeviceType.SERVER,
    DeviceType.UNKNOWN,
  ] as const);
}

function randomLogSourceType(): LogSourceType {
  return pick([
    LogSourceType.SYSLOG,
    LogSourceType.MQTT,
    LogSourceType.HTTP,
  ] as const);
}

function randomLogLevel(): LogLevel {
  return pick([
    LogLevel.TRACE,
    LogLevel.DEBUG,
    LogLevel.INFO,
    LogLevel.WARN,
    LogLevel.ERROR,
    LogLevel.FATAL,
  ] as const);
}

function randomSeverity(): Severity {
  return pick([
    Severity.INFO,
    Severity.LOW,
    Severity.MEDIUM,
    Severity.HIGH,
    Severity.CRITICAL,
  ] as const);
}

function makeLogSourceMeta(type: LogSourceType): Prisma.InputJsonValue {
  if (type === LogSourceType.SYSLOG) {
    return {
      transport: pick(['udp', 'tcp'] as const),
      port: faker.number.int({ min: 514, max: 6514 }),
    };
  }
  if (type === LogSourceType.MQTT) {
    return {
      brokerUrl: `mqtt://${faker.internet.domainName()}:${faker.number.int({
        min: 1883,
        max: 2883,
      })}`,
      topic: `device/${faker.string.uuid()}/logs`,
    };
  }
  return { apiKey: faker.string.alphanumeric(24) };
}

function makeSurfaceProfile(): Prisma.InputJsonValue {
  const portsCount = faker.number.int({ min: 2, max: 10 });
  const rawPorts = Array.from({ length: portsCount }).map(() => {
    const port = pick([
      22, 53, 80, 443, 8080, 8443, 1883, 554, 161, 3306, 5432,
    ] as const);
    const proto = pick(['tcp', 'udp'] as const);
    const service = pick([
      'ssh',
      'dns',
      'http',
      'https',
      'mqtt',
      'rtsp',
      'snmp',
      'postgres',
      'mysql',
    ] as const);
    const version = faker.system.semver();
    return { port, proto, service, version };
  });

  const dedup = new Map<string, any>();
  for (const p of rawPorts) dedup.set(`${p.port}/${p.proto}`, p);

  return { openPorts: Array.from(dedup.values()) };
}

function makeLogMessage(level: LogLevel) {
  const base = pick([
    'Accepted password for admin from',
    'Failed password for invalid user',
    'Connection closed by remote host',
    'HTTP 401 Unauthorized',
    'New device connected',
    'Kernel: possible SYN flooding',
    'MQTT client disconnected',
    'Camera stream started',
  ] as const);

  const tail = `${faker.internet.ipv4()} port ${faker.number.int({
    min: 1,
    max: 65535,
  })}`;

  if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
    return `${base} ${tail} (${faker.hacker.phrase()})`;
  }
  if (level === LogLevel.WARN) return `${base} ${tail}`;
  return `${base} ${faker.hacker.verb()} ${faker.hacker.noun()}`;
}

async function main() {
  await ensureFaker();

  await prisma.auditFinding.deleteMany();
  await prisma.logEntry.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.surfaceSnapshot.deleteMany();
  await prisma.auditRun.deleteMany();
  await prisma.correlationRule.deleteMany();
  await prisma.device.deleteMany();

  await prisma.correlationRule.createMany({
    data: [
      {
        name: 'Brute force SSH (failed password burst)',
        enabled: true,
        matchRegex: 'Failed password|invalid user',
        windowSec: 60,
        threshold: 10,
        severity: Severity.HIGH,
        deviceTypeFilter: DeviceType.ROUTER,
      },
      {
        name: 'Many 401 on HTTP',
        enabled: true,
        matchRegex: '401 Unauthorized|HTTP 401',
        windowSec: 120,
        threshold: 20,
        severity: Severity.MEDIUM,
        deviceTypeFilter: DeviceType.SERVER,
      },
      {
        name: 'MQTT disconnect storm',
        enabled: true,
        matchRegex: 'MQTT client disconnected',
        windowSec: 60,
        threshold: 15,
        severity: Severity.MEDIUM,
        deviceTypeFilter: DeviceType.IOT,
      },
    ],
  });

  const devices: Device[] = [];
  const devicesCount = 12;

  for (let i = 0; i < devicesCount; i++) {
    const type = randomDeviceType();
    const logSourceType = randomLogSourceType();

    const device = await prisma.device.create({
      data: {
        name: `${type.toLowerCase()}-${faker.string
          .alphanumeric({ length: 6 })
          .toLowerCase()}`,
        ip: faker.datatype.boolean() ? faker.internet.ipv4() : null,
        hostname: faker.datatype.boolean() ? faker.internet.domainName() : null,
        type,
        logSourceType,
        logSourceMeta: makeLogSourceMeta(logSourceType),
        isActive: faker.datatype.boolean(),
      },
    });

    devices.push(device);
  }

  for (const device of devices) {
    const baseline = await prisma.surfaceSnapshot.create({
      data: {
        deviceId: device.id,
        profile: makeSurfaceProfile(),
        isBaseline: true,
        createdAt: faker.date.recent({ days: 60 }),
      },
      select: { id: true },
    });

    const extraSnaps = faker.number.int({ min: 1, max: 3 });
    for (let s = 0; s < extraSnaps; s++) {
      await prisma.surfaceSnapshot.create({
        data: {
          deviceId: device.id,
          profile: makeSurfaceProfile(),
          isBaseline: false,
          createdAt: faker.date.recent({ days: 14 }),
        },
      });
    }

    const logsCount = faker.number.int({ min: 50, max: 250 });
    const logIds: string[] = [];

    for (let j = 0; j < logsCount; j++) {
      const level = randomLogLevel();
      const ts = faker.date.recent({ days: 7 });

      const rawObj = faker.datatype.boolean()
        ? ({
            pid: faker.number.int({ min: 1, max: 9999 }),
            tag: 'seed',
          } as Prisma.InputJsonValue)
        : undefined;

      const log = await prisma.logEntry.create({
        data: {
          deviceId: device.id,
          ts,
          level,
          source: device.logSourceType,
          app: faker.datatype.boolean()
            ? pick([
                'sshd',
                'nginx',
                'kernel',
                'mosquitto',
                'camera-daemon',
              ] as const)
            : null,
          host: faker.datatype.boolean() ? device.hostname : null,
          message: makeLogMessage(level),
          raw: rawObj ? (rawObj as Prisma.InputJsonValue) : undefined,
          filePath: faker.datatype.boolean()
            ? `/data/logs/${device.id}/${ts.toISOString().slice(0, 10)}.log`
            : null,
          fileOffset: faker.datatype.boolean()
            ? faker.number.int({ min: 1, max: 200000 })
            : null,
        },
        select: { id: true },
      });

      logIds.push(log.id);
    }

    const auditRunsCount = faker.number.int({ min: 1, max: 4 });
    const auditRunIds: string[] = [];

    for (let a = 0; a < auditRunsCount; a++) {
      const status = pick([
        AuditStatus.PENDING,
        AuditStatus.RUNNING,
        AuditStatus.SUCCESS,
        AuditStatus.FAILED,
      ] as const);

      const startedAt = faker.date.recent({ days: 30 });
      const finishedAt = faker.date.soon({ days: 1, refDate: startedAt });

      const run = await prisma.auditRun.create({
        data: {
          deviceId: device.id,
          status,
          startedAt: status === AuditStatus.PENDING ? null : startedAt,
          finishedAt:
            status === AuditStatus.SUCCESS || status === AuditStatus.FAILED
              ? finishedAt
              : null,
          config: {
            tools: pick([
              ['nmap'],
              ['nmap', 'nuclei'],
              ['nuclei'],
              ['nmap', 'nuclei', 'custom-checks'],
            ] as const),
            fast: faker.datatype.boolean(),
          } as Prisma.InputJsonValue,
          summary: {
            ports: faker.number.int({ min: 0, max: 20 }),
            critical: faker.number.int({ min: 0, max: 3 }),
            high: faker.number.int({ min: 0, max: 6 }),
            medium: faker.number.int({ min: 0, max: 12 }),
          } as Prisma.InputJsonValue,
        },
        select: { id: true },
      });

      auditRunIds.push(run.id);

      const findingsCount = faker.number.int({ min: 0, max: 8 });
      for (let f = 0; f < findingsCount; f++) {
        const kind = pick([
          'open_port',
          'service',
          'cve',
          'misconfig',
        ] as const);
        const port =
          kind === 'open_port' || kind === 'service'
            ? pick([22, 80, 443, 1883, 554, 8080, 8443] as const)
            : null;

        await prisma.auditFinding.create({
          data: {
            auditRunId: run.id,
            title: pick([
              'Open port detected',
              'Service banner exposed',
              'Potential CVE detected',
              'Weak configuration',
              'Default credentials suspected',
            ] as const),
            severity: randomSeverity(),
            kind,
            port,
            protocol: port ? pick(['tcp', 'udp'] as const) : null,
            service: port
              ? pick(['ssh', 'http', 'https', 'mqtt', 'rtsp'] as const)
              : null,
            cve:
              kind === 'cve'
                ? `CVE-${faker.number.int({ min: 2015, max: 2026 })}-${faker.number.int({ min: 1000, max: 99999 })}`
                : null,
            description: faker.datatype.boolean()
              ? faker.lorem.paragraph()
              : null,
            evidence: {
              sample: faker.lorem.lines(2),
              tool: 'seed',
            } as Prisma.InputJsonValue,
            remediation: faker.datatype.boolean()
              ? pick([
                  'Update firmware',
                  'Restrict access',
                  'Disable service',
                  'Rotate credentials',
                ] as const)
              : null,
          },
        });
      }
    }

    const alertsCount = faker.number.int({ min: 0, max: 6 });
    for (let al = 0; al < alertsCount; al++) {
      const type = pick([
        AlertType.SURFACE_CHANGED,
        AlertType.LOG_CORRELATION,
        AlertType.AUDIT_CRITICAL,
        AlertType.DEVICE_OFFLINE,
      ] as const);

      const severity =
        type === AlertType.AUDIT_CRITICAL
          ? pick([Severity.HIGH, Severity.CRITICAL] as const)
          : randomSeverity();

      const maybeAuditRunId = auditRunIds.length ? pick(auditRunIds) : null;
      const maybeLogEntryId = logIds.length ? pick(logIds) : null;

      await prisma.alert.create({
        data: {
          deviceId: device.id,
          type,
          severity,
          title: pick([
            'Suspicious activity detected',
            'Surface changed',
            'Critical audit finding',
            'Device offline',
            'Correlation rule triggered',
          ] as const),
          message: faker.lorem.sentence(),
          data:
            type === AlertType.SURFACE_CHANGED
              ? ({
                  baselineSnapshotId: baseline.id,
                  diff: {
                    addedPorts: [pick([8080, 8443] as const)],
                    removedPorts: [],
                  },
                } as Prisma.InputJsonValue)
              : type === AlertType.LOG_CORRELATION
                ? ({
                    rule: 'seed',
                    windowSec: 60,
                    threshold: 10,
                  } as Prisma.InputJsonValue)
                : type === AlertType.AUDIT_CRITICAL
                  ? ({ auditRunId: maybeAuditRunId } as Prisma.InputJsonValue)
                  : ({
                      lastSeen: faker.date.recent({ days: 2 }).toISOString(),
                    } as Prisma.InputJsonValue),
          auditRunId: faker.datatype.boolean() ? maybeAuditRunId : null,
          logEntryId: faker.datatype.boolean() ? maybeLogEntryId : null,
          acknowledgedAt: faker.datatype.boolean()
            ? faker.date.recent({ days: 10 })
            : null,
          createdAt: faker.date.recent({ days: 20 }),
        },
      });
    }
  }

  console.log('Seed done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // ✅ закрываем pool
  });
