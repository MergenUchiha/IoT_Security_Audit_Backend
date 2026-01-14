import { Module } from '@nestjs/common';
import { AuditsController } from './audits.controller';
import { ScansModule } from '../scans/scans.module';

@Module({
  imports: [ScansModule],
  controllers: [AuditsController],
})
export class AuditsModule {}