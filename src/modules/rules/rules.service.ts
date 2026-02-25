import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@Injectable()
export class RulesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRuleDto) {
    return this.prisma.correlationRule.create({
      data: {
        name: dto.name,
        enabled: dto.enabled ?? true,
        matchRegex: dto.matchRegex,
        windowSec: dto.windowSec ?? 60,
        threshold: dto.threshold ?? 10,
        severity: dto.severity,
        deviceTypeFilter: dto.deviceTypeFilter,
        deviceIdFilter: dto.deviceIdFilter,
      },
    });
  }

  list() {
    return this.prisma.correlationRule.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async get(id: string) {
    const r = await this.prisma.correlationRule.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Rule not found');
    return r;
  }

  async update(id: string, dto: UpdateRuleDto) {
    await this.get(id);
    return this.prisma.correlationRule.update({
      where: { id },
      data: {
        name: dto.name,
        enabled: dto.enabled,
        matchRegex: dto.matchRegex,
        windowSec: dto.windowSec,
        threshold: dto.threshold,
        severity: dto.severity,
        deviceTypeFilter: dto.deviceTypeFilter,
        deviceIdFilter: dto.deviceIdFilter,
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    return this.prisma.correlationRule.delete({ where: { id } });
  }
}
