import { Injectable } from '@nestjs/common';
import { AlertType, LogEntry, Severity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CorrelationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Проверяем лог на попадание под CorrelationRule.
   * Без Redis: считаем количество совпавших логов за окно времени запросом в Postgres.
   */
  async processLog(log: LogEntry) {
    // Быстрый выход: если лог пустой (не должно быть)
    if (!log.message) return;

    // Берём только enabled правила
    const rules = await this.prisma.correlationRule.findMany({
      where: { enabled: true },
      orderBy: { createdAt: 'asc' },
    });

    if (rules.length === 0) return;

    for (const rule of rules) {
      // фильтр по deviceId (если задан)
      if (rule.deviceIdFilter && rule.deviceIdFilter !== log.deviceId) continue;

      // фильтр по deviceType (если задан)
      if (rule.deviceTypeFilter) {
        const device = await this.prisma.device.findUnique({
          where: { id: log.deviceId },
          select: { type: true },
        });
        if (!device || device.type !== rule.deviceTypeFilter) continue;
      }

      // regex match
      let re: RegExp;
      try {
        re = new RegExp(rule.matchRegex, 'i');
      } catch {
        // некорректное правило — пропускаем
        continue;
      }

      if (!re.test(log.message)) continue;

      const windowMs = rule.windowSec * 1000;
      const from = new Date(log.ts.getTime() - windowMs);

      // считаем кол-во логов за окно времени, которые тоже матчятся regex
      // IMPORTANT: Postgres не умеет regex count по JS regex напрямую.
      // Делается так:
      // 1) берём последние N логов по времени и в коде проверяем regex
      // Для диплома это ок (малый объём). N выбираем разумный.
      //
      // Оптимизация на будущее: хранить ruleId в отдельной таблице hits, или использовать pg_trgm/fulltext.
      const recent = await this.prisma.logEntry.findMany({
        where: {
          deviceId: log.deviceId,
          ts: { gte: from, lte: log.ts },
        },
        orderBy: { ts: 'desc' },
        take: 500, // ограничиваем, чтобы не убить БД
        select: { id: true, ts: true, message: true },
      });

      const hits = recent.filter((l) => re.test(l.message)).length;
      if (hits < rule.threshold) continue;

      // анти-спам: не создаём одинаковый алерт слишком часто
      const cooldownSec = Math.max(5, Math.min(rule.windowSec, 300));
      const cooldownFrom = new Date(log.ts.getTime() - cooldownSec * 1000);

      const existing = await this.prisma.alert.findFirst({
        where: {
          deviceId: log.deviceId,
          type: AlertType.LOG_CORRELATION,
          createdAt: { gte: cooldownFrom },
          data: {
            path: ['ruleId'],
            equals: rule.id,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) continue;

      await this.prisma.alert.create({
        data: {
          deviceId: log.deviceId,
          type: AlertType.LOG_CORRELATION,
          severity: rule.severity ?? Severity.MEDIUM,
          title: `Log correlation triggered: ${rule.name}`,
          message: `Matched "${rule.matchRegex}" ${hits} times in last ${rule.windowSec}s (threshold=${rule.threshold}).`,
          data: {
            ruleId: rule.id,
            ruleName: rule.name,
            matchRegex: rule.matchRegex,
            windowSec: rule.windowSec,
            threshold: rule.threshold,
            hits,
            sampleLogId: log.id,
          },
          logEntryId: log.id,
        },
      });
    }
  }
}
