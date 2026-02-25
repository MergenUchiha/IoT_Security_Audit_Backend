import { Injectable } from '@nestjs/common';
import { LogEntry } from '@prisma/client';

type Subscriber = (log: LogEntry) => void;

@Injectable()
export class StreamService {
  private readonly subscribers = new Map<string, Set<Subscriber>>();

  subscribe(deviceId: string, fn: Subscriber): () => void {
    const set = this.subscribers.get(deviceId) ?? new Set<Subscriber>();
    set.add(fn);
    this.subscribers.set(deviceId, set);

    return () => {
      const cur = this.subscribers.get(deviceId);
      if (!cur) return;
      cur.delete(fn);
      if (cur.size === 0) this.subscribers.delete(deviceId);
    };
  }

  publishLog(deviceId: string, log: LogEntry) {
    const set = this.subscribers.get(deviceId);
    if (!set) return;
    for (const fn of set) fn(log);
  }
}
