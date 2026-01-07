-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('online', 'offline', 'warning');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "VulnerabilityStatus" AS ENUM ('open', 'patched', 'mitigated');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'online',
    "risk" "RiskLevel" NOT NULL DEFAULT 'medium',
    "manufacturer" TEXT NOT NULL,
    "firmware" TEXT NOT NULL,
    "ports" INTEGER[],
    "services" TEXT[],
    "vulnerabilities" INTEGER NOT NULL DEFAULT 0,
    "lastScan" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerabilities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" "RiskLevel" NOT NULL,
    "cvss" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "discovered" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vulnerabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_vulnerabilities" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "vulnerabilityId" TEXT NOT NULL,
    "status" "VulnerabilityStatus" NOT NULL DEFAULT 'open',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_vulnerabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'pending',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "phases" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_findings" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "vulnerabilityId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_traffic" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incoming" INTEGER NOT NULL DEFAULT 0,
    "outgoing" INTEGER NOT NULL DEFAULT 0,
    "suspicious" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,

    CONSTRAINT "network_traffic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_metrics" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "devicesOnline" INTEGER NOT NULL DEFAULT 0,
    "totalDevices" INTEGER NOT NULL DEFAULT 0,
    "totalVulnerabilities" INTEGER NOT NULL DEFAULT 0,
    "criticalIssues" INTEGER NOT NULL DEFAULT 0,
    "highIssues" INTEGER NOT NULL DEFAULT 0,
    "mediumIssues" INTEGER NOT NULL DEFAULT 0,
    "lowIssues" INTEGER NOT NULL DEFAULT 0,
    "activeScans" INTEGER NOT NULL DEFAULT 0,
    "completedScans" INTEGER NOT NULL DEFAULT 0,
    "owaspScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nistScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gdprScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "iso27001Score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cisScore" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "security_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerability_trends" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "critical" INTEGER NOT NULL DEFAULT 0,
    "high" INTEGER NOT NULL DEFAULT 0,
    "medium" INTEGER NOT NULL DEFAULT 0,
    "low" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vulnerability_trends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "device" TEXT,
    "severity" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "devices" INTEGER NOT NULL DEFAULT 0,
    "vulnerabilities" INTEGER NOT NULL DEFAULT 0,
    "findings" JSONB,
    "recommendations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_ip_key" ON "devices"("ip");

-- CreateIndex
CREATE INDEX "devices_status_idx" ON "devices"("status");

-- CreateIndex
CREATE INDEX "devices_risk_idx" ON "devices"("risk");

-- CreateIndex
CREATE INDEX "vulnerabilities_severity_idx" ON "vulnerabilities"("severity");

-- CreateIndex
CREATE INDEX "device_vulnerabilities_deviceId_idx" ON "device_vulnerabilities"("deviceId");

-- CreateIndex
CREATE INDEX "device_vulnerabilities_vulnerabilityId_idx" ON "device_vulnerabilities"("vulnerabilityId");

-- CreateIndex
CREATE UNIQUE INDEX "device_vulnerabilities_deviceId_vulnerabilityId_key" ON "device_vulnerabilities"("deviceId", "vulnerabilityId");

-- CreateIndex
CREATE INDEX "scans_deviceId_idx" ON "scans"("deviceId");

-- CreateIndex
CREATE INDEX "scans_status_idx" ON "scans"("status");

-- CreateIndex
CREATE INDEX "scans_startTime_idx" ON "scans"("startTime");

-- CreateIndex
CREATE INDEX "scan_findings_scanId_idx" ON "scan_findings"("scanId");

-- CreateIndex
CREATE INDEX "network_traffic_timestamp_idx" ON "network_traffic"("timestamp");

-- CreateIndex
CREATE INDEX "security_metrics_timestamp_idx" ON "security_metrics"("timestamp");

-- CreateIndex
CREATE INDEX "vulnerability_trends_year_idx" ON "vulnerability_trends"("year");

-- CreateIndex
CREATE UNIQUE INDEX "vulnerability_trends_month_year_key" ON "vulnerability_trends"("month", "year");

-- CreateIndex
CREATE INDEX "activity_logs_timestamp_idx" ON "activity_logs"("timestamp");

-- CreateIndex
CREATE INDEX "activity_logs_type_idx" ON "activity_logs"("type");

-- CreateIndex
CREATE INDEX "reports_type_idx" ON "reports"("type");

-- CreateIndex
CREATE INDEX "reports_createdAt_idx" ON "reports"("createdAt");

-- AddForeignKey
ALTER TABLE "device_vulnerabilities" ADD CONSTRAINT "device_vulnerabilities_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_vulnerabilities" ADD CONSTRAINT "device_vulnerabilities_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "vulnerabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_findings" ADD CONSTRAINT "scan_findings_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_findings" ADD CONSTRAINT "scan_findings_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "vulnerabilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
