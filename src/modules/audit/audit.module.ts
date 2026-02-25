import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { SurfaceService } from './surface/surface.service';

@Module({
  controllers: [AuditController],
  providers: [AuditService, SurfaceService],
})
export class AuditModule {}
