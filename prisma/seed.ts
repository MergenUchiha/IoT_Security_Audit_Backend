import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for IoT Security Audit System...');

  // Create Devices
  const device1 = await prisma.device.create({
    data: {
      name: 'Smart Thermostat',
      ip: '192.168.1.45',
      type: 'IoT Sensor',
      status: 'online',
      risk: 'high',
      manufacturer: 'TechCorp',
      firmware: 'v2.1.4',
      ports: [80, 443, 8080],
      services: ['HTTP', 'HTTPS', 'Custom API'],
      vulnerabilities: 12,
      lastScan: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h ago
    },
  });

  const device2 = await prisma.device.create({
    data: {
      name: 'Security Camera #1',
      ip: '192.168.1.67',
      type: 'Camera',
      status: 'online',
      risk: 'critical',
      manufacturer: 'SecureCam',
      firmware: 'v1.8.2',
      ports: [23, 554, 8000],
      services: ['Telnet', 'RTSP', 'Web Interface'],
      vulnerabilities: 23,
      lastScan: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5h ago
    },
  });

  const device3 = await prisma.device.create({
    data: {
      name: 'Smart Lock',
      ip: '192.168.1.89',
      type: 'Access Control',
      status: 'offline',
      risk: 'medium',
      manufacturer: 'LockTech',
      firmware: 'v3.0.1',
      ports: [443, 8883],
      services: ['HTTPS', 'MQTT'],
      vulnerabilities: 5,
      lastScan: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1d ago
    },
  });

  const device4 = await prisma.device.create({
    data: {
      name: 'IP Gateway',
      ip: '192.168.1.1',
      type: 'Network',
      status: 'online',
      risk: 'low',
      manufacturer: 'NetGear',
      firmware: 'v4.2.0',
      ports: [80, 443, 22],
      services: ['HTTP', 'HTTPS', 'SSH'],
      vulnerabilities: 2,
      lastScan: new Date(Date.now() - 30 * 60 * 1000), // 30m ago
    },
  });

  const device5 = await prisma.device.create({
    data: {
      name: 'Smart Light Hub',
      ip: '192.168.1.101',
      type: 'IoT Hub',
      status: 'online',
      risk: 'medium',
      manufacturer: 'LightSmart',
      firmware: 'v2.5.3',
      ports: [80, 443, 5353],
      services: ['HTTP', 'HTTPS', 'mDNS'],
      vulnerabilities: 7,
      lastScan: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4h ago
    },
  });

  console.log('✅ Created 5 devices');

  // Create Vulnerabilities (CVE Database)
  const vuln1 = await prisma.vulnerability.create({
    data: {
      id: 'CVE-2024-1234',
      title: 'Buffer Overflow in Authentication Module',
      severity: 'critical',
      cvss: 9.8,
      description: 'A buffer overflow vulnerability in the authentication module allows remote code execution.',
      impact: 'Complete device compromise, potential network infiltration',
      solution: 'Update firmware to v1.9.0 or disable remote access',
      discovered: new Date('2024-01-05'),
    },
  });

  const vuln2 = await prisma.vulnerability.create({
    data: {
      id: 'CVE-2024-5678',
      title: 'Weak Default Credentials',
      severity: 'high',
      cvss: 8.1,
      description: 'Device ships with default credentials that are publicly known.',
      impact: 'Unauthorized access to device configuration and data',
      solution: 'Force password change on first login',
      discovered: new Date('2024-01-04'),
    },
  });

  const vuln3 = await prisma.vulnerability.create({
    data: {
      id: 'CVE-2023-9012',
      title: 'SQL Injection in Web Interface',
      severity: 'high',
      cvss: 7.5,
      description: 'SQL injection vulnerability in device web interface allows data extraction.',
      impact: 'Database compromise, credential theft',
      solution: 'Already patched in firmware v2.1.5',
      discovered: new Date('2024-01-03'),
    },
  });

  const vuln4 = await prisma.vulnerability.create({
    data: {
      id: 'CVE-2024-3456',
      title: 'Insecure Firmware Update Mechanism',
      severity: 'medium',
      cvss: 6.5,
      description: 'Firmware updates are not signed or verified, allowing malicious firmware installation.',
      impact: 'Potential for persistent malware installation',
      solution: 'Implement firmware signing and verification',
      discovered: new Date('2024-01-02'),
    },
  });

  const vuln5 = await prisma.vulnerability.create({
    data: {
      id: 'CVE-2024-7890',
      title: 'Cross-Site Scripting (XSS)',
      severity: 'medium',
      cvss: 5.4,
      description: 'Stored XSS vulnerability in device configuration pages.',
      impact: 'Session hijacking, credential theft',
      solution: 'Input validation implemented, update to v4.2.1',
      discovered: new Date('2024-01-01'),
    },
  });

  console.log('✅ Created 5 vulnerabilities');

  // Link vulnerabilities to devices
  await prisma.deviceVulnerability.create({
    data: {
      deviceId: device2.id,
      vulnerabilityId: vuln1.id,
      status: 'open',
    },
  });

  await prisma.deviceVulnerability.create({
    data: {
      deviceId: device1.id,
      vulnerabilityId: vuln2.id,
      status: 'open',
    },
  });

  await prisma.deviceVulnerability.create({
    data: {
      deviceId: device1.id,
      vulnerabilityId: vuln3.id,
      status: 'patched',
    },
  });

  await prisma.deviceVulnerability.create({
    data: {
      deviceId: device3.id,
      vulnerabilityId: vuln4.id,
      status: 'open',
    },
  });

  await prisma.deviceVulnerability.create({
    data: {
      deviceId: device4.id,
      vulnerabilityId: vuln5.id,
      status: 'mitigated',
    },
  });

  console.log('✅ Linked vulnerabilities to devices');

  // Create Network Traffic data
  const trafficData = [
    { period: '00:00', incoming: 245, outgoing: 189, suspicious: 12 },
    { period: '00:05', incoming: 312, outgoing: 245, suspicious: 8 },
    { period: '00:10', incoming: 289, outgoing: 267, suspicious: 15 },
    { period: '00:15', incoming: 378, outgoing: 312, suspicious: 23 },
    { period: '00:20', incoming: 423, outgoing: 289, suspicious: 34 },
    { period: '00:25', incoming: 512, outgoing: 378, suspicious: 45 },
  ];

  for (const traffic of trafficData) {
    await prisma.networkTraffic.create({
      data: traffic,
    });
  }

  console.log('✅ Created network traffic data');

  // Create Vulnerability Trends
  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
  const trendData = [
    { critical: 5, high: 12, medium: 23, low: 8 },
    { critical: 8, high: 15, medium: 19, low: 12 },
    { critical: 6, high: 18, medium: 25, low: 10 },
    { critical: 12, high: 22, medium: 28, low: 15 },
    { critical: 9, high: 20, medium: 24, low: 11 },
    { critical: 15, high: 28, medium: 31, low: 18 },
  ];

  for (let i = 0; i < months.length; i++) {
    await prisma.vulnerabilityTrend.create({
      data: {
        month: months[i],
        year: 2024,
        ...trendData[i],
      },
    });
  }

  console.log('✅ Created vulnerability trends');

  // Create Security Metrics
  await prisma.securityMetrics.create({
    data: {
      devicesOnline: 4,
      totalDevices: 5,
      totalVulnerabilities: 49,
      criticalIssues: 15,
      highIssues: 28,
      mediumIssues: 31,
      lowIssues: 18,
      activeScans: 0,
      completedScans: 12,
      owaspScore: 72,
      nistScore: 68,
      gdprScore: 85,
      iso27001Score: 78,
      cisScore: 65,
    },
  });

  console.log('✅ Created security metrics');

  // Create Activity Logs
  const activities = [
    {
      type: 'scan',
      message: 'Full network scan completed',
      device: 'All Devices',
      severity: 'info',
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
    },
    {
      type: 'alert',
      message: 'Critical vulnerability detected',
      device: 'Security Camera #1',
      severity: 'critical',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
    },
    {
      type: 'update',
      message: 'Firmware update available',
      device: 'Smart Thermostat',
      severity: 'info',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
    },
    {
      type: 'alert',
      message: 'Suspicious network traffic detected',
      device: 'IP Gateway',
      severity: 'high',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      type: 'scan',
      message: 'Device added to inventory',
      device: 'Smart Light Hub',
      severity: 'info',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
  ];

  for (const activity of activities) {
    await prisma.activityLog.create({
      data: activity,
    });
  }

  console.log('✅ Created activity logs');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });