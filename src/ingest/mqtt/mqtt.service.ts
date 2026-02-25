import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { LogSourceType } from '@prisma/client';
import { normalizeLevel } from '../../common/utils/log-level.util';
import { LogsService } from 'src/modules/logs/logs.service';
import { DevicesService } from 'src/modules/devices/devices.service';

type MqttPayload = {
  deviceId?: string;
  level?: string | number;
  app?: string;
  host?: string;
  message?: string;
  ts?: string;
  raw?: any;
};

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client?: mqtt.MqttClient;

  constructor(
    private readonly config: ConfigService,
    private readonly logs: LogsService,
    private readonly devices: DevicesService,
  ) {}

  async onModuleInit() {
    const enabled =
      String(this.config.get('MQTT_ENABLED') ?? 'true') === 'true';
    if (!enabled) return;

    const url = String(this.config.get('MQTT_URL') ?? 'mqtt://mosquitto:1883');
    const topic = String(this.config.get('MQTT_LOGS_TOPIC') ?? 'device/+/logs');

    this.client = mqtt.connect(url, {
      reconnectPeriod: 1000,
    });

    this.client.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log(`[MQTT] connected: ${url}`);
      this.client?.subscribe(topic, { qos: 0 }, (err) => {
        if (err) console.error('[MQTT] subscribe error', err);
        else console.log(`[MQTT] subscribed: ${topic}`);
      });
    });

    this.client.on('message', async (receivedTopic, payloadBuf) => {
      try {
        const payloadStr = payloadBuf.toString('utf-8');
        let payload: MqttPayload;
        try {
          payload = JSON.parse(payloadStr);
        } catch {
          payload = { message: payloadStr };
        }

        // device/<deviceId>/logs  -> extract from topic
        const deviceIdFromTopic = extractDeviceId(receivedTopic);
        const deviceId = payload.deviceId ?? deviceIdFromTopic;
        if (!deviceId) return;

        // ensure device exists (or you can skip this check)
        await this.devices.get(deviceId).catch(() => null);

        const ts = payload.ts ? new Date(payload.ts) : undefined;

        const msg = payload.message ?? payloadStr;
        await this.logs.create(deviceId, {
          ts,
          level: normalizeLevel(payload.level),
          source: LogSourceType.MQTT,
          app: payload.app,
          host: payload.host,
          message: msg,
          raw: payload.raw ?? payload,
        });
      } catch (e) {
        console.error('[MQTT] message handler error', e);
      }
    });

    this.client.on('error', (e) => console.error('[MQTT] error', e));
  }

  async onModuleDestroy() {
    await new Promise<void>((resolve) => {
      if (!this.client) return resolve();
      this.client.end(false, {}, () => resolve());
    });
  }
}

function extractDeviceId(topic: string): string | undefined {
  // expected: device/<id>/logs
  const parts = topic.split('/');
  if (parts.length >= 3 && parts[0] === 'device' && parts[2] === 'logs') {
    return parts[1];
  }
  return undefined;
}
