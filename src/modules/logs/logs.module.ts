// src/logs/logs.module.ts
import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { StreamModule } from 'src/ingest/stream/stream.module';
import { DetectionModule } from '../detection/detection.module';
import { LogsService } from './logs.service';

@Module({
  imports: [StreamModule, DetectionModule],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
