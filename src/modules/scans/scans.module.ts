import { Module, forwardRef } from '@nestjs/common';
import { ScansService } from './scans.service';
import { ScansController } from './scans.controller';
import { IoTScannerService } from './iot-scanner.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [forwardRef(() => EventsModule)],
  controllers: [ScansController],
  providers: [ScansService, IoTScannerService],
  exports: [ScansService, IoTScannerService],
})
export class ScansModule {}