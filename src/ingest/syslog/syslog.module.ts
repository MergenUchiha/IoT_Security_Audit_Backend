import { Module } from '@nestjs/common';
import { SyslogUdpService } from './syslog-udp.service';
import { LogsModule } from 'src/modules/logs/logs.module';
import { DevicesModule } from 'src/modules/devices/devices.module';

@Module({
  imports: [LogsModule, DevicesModule],
  providers: [SyslogUdpService],
})
export class SyslogModule {}
