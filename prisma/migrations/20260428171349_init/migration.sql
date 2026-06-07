-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ip" TEXT,
    "hostname" TEXT,
    "type" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "logSourceType" TEXT NOT NULL DEFAULT 'SYSLOG',
    "logSourceMeta" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleCron" TEXT,
    "scheduleEmail" TEXT,
    "scheduleLastRun" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "source" TEXT NOT NULL,
    "app" TEXT,
    "host" TEXT,
    "message" TEXT NOT NULL,
    "raw" JSONB,
    "filePath" TEXT,
    "fileOffset" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogEntry_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "config" JSONB,
    "summary" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditRun_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditFinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditRunId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "kind" TEXT NOT NULL,
    "port" INTEGER,
    "protocol" TEXT,
    "service" TEXT,
    "cve" TEXT,
    "description" TEXT,
    "evidence" JSONB,
    "remediation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditFinding_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "AuditRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SurfaceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "profile" JSONB NOT NULL,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurfaceSnapshot_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "auditRunId" TEXT,
    "logEntryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" DATETIME,
    CONSTRAINT "Alert_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorrelationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "matchRegex" TEXT NOT NULL,
    "windowSec" INTEGER NOT NULL DEFAULT 60,
    "threshold" INTEGER NOT NULL DEFAULT 10,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "deviceTypeFilter" TEXT,
    "deviceIdFilter" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "LogEntry_deviceId_ts_idx" ON "LogEntry"("deviceId", "ts" DESC);

-- CreateIndex
CREATE INDEX "LogEntry_deviceId_level_ts_idx" ON "LogEntry"("deviceId", "level", "ts" DESC);

-- CreateIndex
CREATE INDEX "AuditRun_deviceId_createdAt_idx" ON "AuditRun"("deviceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditFinding_auditRunId_severity_idx" ON "AuditFinding"("auditRunId", "severity");

-- CreateIndex
CREATE INDEX "SurfaceSnapshot_deviceId_createdAt_idx" ON "SurfaceSnapshot"("deviceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Alert_deviceId_createdAt_idx" ON "Alert"("deviceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Alert_type_createdAt_idx" ON "Alert"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CorrelationRule_enabled_idx" ON "CorrelationRule"("enabled");
