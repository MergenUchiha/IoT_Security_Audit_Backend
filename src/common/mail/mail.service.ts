import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port ?? 587,
        secure: (port ?? 587) === 465,
        auth: user ? { user, pass } : undefined,
      });
      this.logger.log(`Mail transport configured: ${host}:${port ?? 587}`);
    } else {
      this.logger.warn(
        'SMTP_HOST not set — email notifications disabled. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env',
      );
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendAuditReport(
    to: string,
    deviceName: string,
    summary: {
      findings: {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
      };
      toolErrors: Array<{ tool: string; error: string }>;
      surfaceChanged: boolean;
    },
    auditRunId: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Cannot send email to ${to} — SMTP not configured`);
      return;
    }

    const from =
      this.config.get<string>('SMTP_FROM') ?? 'iot-audit@mergen.local';

    const { findings, toolErrors, surfaceChanged } = summary;

    const severityLine = [
      findings.critical > 0 ? `CRITICAL: ${findings.critical}` : '',
      findings.high > 0 ? `HIGH: ${findings.high}` : '',
      findings.medium > 0 ? `MEDIUM: ${findings.medium}` : '',
      findings.low > 0 ? `LOW: ${findings.low}` : '',
      findings.info > 0 ? `INFO: ${findings.info}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const subject = `[IoT Audit] ${deviceName} — ${findings.total} findings${findings.critical > 0 ? ' (CRITICAL!)' : ''}`;

    const html = `
      <div style="font-family: monospace; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #06b6d4;">IoT Security Audit Report</h2>
        <p><strong>Device:</strong> ${deviceName}</p>
        <p><strong>Audit ID:</strong> ${auditRunId}</p>
        <p><strong>Date:</strong> ${new Date().toISOString()}</p>
        <hr style="border-color: #334155;" />

        <h3>Findings Summary</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 4px 12px; color: #ef4444; font-weight: bold;">Critical</td>
            <td style="padding: 4px 12px;">${findings.critical}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px; color: #f97316; font-weight: bold;">High</td>
            <td style="padding: 4px 12px;">${findings.high}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px; color: #eab308; font-weight: bold;">Medium</td>
            <td style="padding: 4px 12px;">${findings.medium}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px; color: #22c55e; font-weight: bold;">Low</td>
            <td style="padding: 4px 12px;">${findings.low}</td>
          </tr>
          <tr>
            <td style="padding: 4px 12px; color: #3b82f6;">Info</td>
            <td style="padding: 4px 12px;">${findings.info}</td>
          </tr>
          <tr style="border-top: 1px solid #334155;">
            <td style="padding: 4px 12px; font-weight: bold;">Total</td>
            <td style="padding: 4px 12px; font-weight: bold;">${findings.total}</td>
          </tr>
        </table>

        ${surfaceChanged ? '<p style="color: #f97316; font-weight: bold;">&#9888; Attack surface has changed since last scan!</p>' : ''}

        ${
          toolErrors.length > 0
            ? `<h3>Tool Errors</h3><ul>${toolErrors.map((e) => `<li><strong>${e.tool}:</strong> ${e.error}</li>`).join('')}</ul>`
            : ''
        }

        <hr style="border-color: #334155;" />
        <p style="color: #94a3b8; font-size: 12px;">
          This is an automated report from IoT Security Audit Platform (Mergen).
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Audit report sent to ${to} for device "${deviceName}"`);
    } catch (err: any) {
      this.logger.error(
        `Failed to send email to ${to}: ${err.message ?? err}`,
      );
    }
  }
}
