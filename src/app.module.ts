import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { DevicesModule } from './modules/devices/devices.module';
import { LogsModule } from './modules/logs/logs.module';
import { IngestModule } from './ingest/ingest.module';
import { AuditModule } from './modules/audit/audit.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { RulesModule } from './modules/rules/rules.module';
import { DetectionModule } from './modules/detection/detection.module';
import { SummaryModule } from './modules/summary/summary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    DevicesModule,
    LogsModule,
    IngestModule,
    AuditModule,
    AlertsModule,
    RulesModule,
    DetectionModule,
    SummaryModule,
  ],
})
export class AppModule {}
