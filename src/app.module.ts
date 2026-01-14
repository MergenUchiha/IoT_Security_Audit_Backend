import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DevicesModule } from './modules/devices/devices.module';
import { ScansModule } from './modules/scans/scans.module';
import { VulnerabilitiesModule } from './modules/vulnerabilities/vulnerabilities.module';
import { ReportsModule } from './modules/reports/reports.module';
import { EventsModule } from './modules/events/events.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditsModule } from './modules/audits/audits.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    DevicesModule,
    ScansModule,
    VulnerabilitiesModule,
    ReportsModule,
    AnalyticsModule,
    AuditsModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}