import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class RunAuditDto {
  @ApiPropertyOptional({ default: true, description: 'Run Nmap scan' })
  @IsOptional()
  @IsBoolean()
  nmap?: boolean = true;

  @ApiPropertyOptional({
    default: true,
    description: 'Run Nuclei scan (requires nuclei binary installed)',
  })
  @IsOptional()
  @IsBoolean()
  nuclei?: boolean = true;

  @ApiPropertyOptional({
    description: 'Override target URL for nuclei (e.g. https://1.2.3.4)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  nucleiTargetUrl?: string;

  @ApiPropertyOptional({
    description: 'Extra nuclei args (very limited; keep safe)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  nucleiArgs?: string;
}
