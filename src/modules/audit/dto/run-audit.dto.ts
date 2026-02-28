import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class RunAuditDto {
  @ApiPropertyOptional({ default: true, description: 'Run Nmap scan' })
  @IsOptional()
  @IsBoolean()
  nmap?: boolean = true;

  @ApiPropertyOptional({
    default: false,
    description:
      'Run Nuclei scan (requires nuclei.exe in PATH or C:\\Program Files (x86)\\Nmap\\)',
  })
  @IsOptional()
  @IsBoolean()
  nuclei?: boolean = false;

  @ApiPropertyOptional({
    description:
      'Target URL for nuclei. If omitted, guessed from nmap results (http/https by open ports). ' +
      'Example: http://testphp.vulnweb.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  nucleiTargetUrl?: string;

  @ApiPropertyOptional({
    description: 'Extra nuclei args, e.g. "-severity critical,high -tags cve"',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  nucleiArgs?: string;
}
