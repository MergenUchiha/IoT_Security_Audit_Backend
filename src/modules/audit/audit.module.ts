import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { SurfaceService } from './surface/surface.service';
import { ScheduledAuditService } from './scheduled-audit.service';

@Module({
  controllers: [AuditController],
  providers: [AuditService, SurfaceService, ScheduledAuditService],
  exports: [AuditService],
})
export class AuditModule {}
