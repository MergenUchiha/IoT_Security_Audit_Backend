import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { DevicesModule } from './modules/devices/devices.module';
import { IngestModule } from './ingest/ingest.module';
import { AuditModule } from './modules/audit/audit.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { RulesModule } from './modules/rules/rules.module';
import { DetectionModule } from './modules/detection/detection.module';
import { SummaryModule } from './modules/summary/summary.module';
import { SelfLogLogger } from './common/logger/self-log.logger';
import { LogsModule } from './modules/logs/logs.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DevicesModule,
    LogsModule,
    IngestModule,
    AuditModule,
    AlertsModule,
    RulesModule,
    DetectionModule,
    SummaryModule,
  ],
  providers: [
    SelfLogLogger,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [SelfLogLogger],
})
export class AppModule {}
