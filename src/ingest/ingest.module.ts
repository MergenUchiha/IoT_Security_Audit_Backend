import { Module } from '@nestjs/common';
import { IngestHttpController } from './http/ingest-http.controller';
import { MqttModule } from './mqtt/mqtt.module';
import { SyslogModule } from './syslog/syslog.module';
import { StreamModule } from './stream/stream.module';
import { LogsModule } from 'src/modules/logs/logs.module';

@Module({
  imports: [LogsModule, StreamModule, MqttModule, SyslogModule],
  controllers: [IngestHttpController],
})
export class IngestModule {}
