import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ScansService } from '../scans/scans.service';
import { StartScanDto } from '../scans/dto/scan.dto';

@ApiTags('audits')
@Controller('audits')
export class AuditsController {
  constructor(private readonly scansService: ScansService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a new security audit (alias for scan)' })
  @ApiResponse({ status: 201, description: 'Audit started successfully' })
  @ApiBody({ type: StartScanDto })
  start(@Body(ValidationPipe) dto: StartScanDto) {
    return this.scansService.start(dto);
  }
}