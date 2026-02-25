import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { LogsModule } from 'src/modules/logs/logs.module';
import { DevicesModule } from 'src/modules/devices/devices.module';

@Module({
  imports: [LogsModule, DevicesModule],
  providers: [MqttService],
})
export class MqttModule {}
