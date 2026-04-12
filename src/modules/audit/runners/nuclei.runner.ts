import { spawn } from 'node:child_process';
import { Logger } from '@nestjs/common';
import { Severity } from '@prisma/client';

const logger = new Logger('NucleiRunner');

type NucleiFinding = {
  title: string;
  severity: Severity;
  kind: string;
  description?: string | null;
  evidence?: any;
  remediation?: string | null;
};

const FALLBACK_PATHS =
  process.platform === 'win32'
    ? [
        'C:\\Program Files\\nuclei\\nuclei.exe',
        'C:\\Program Files (x86)\\Nmap\\nuclei.exe',
        'C:\\Program Files\\Nmap\\nuclei.exe',
        'C:\\nuclei\\nuclei.exe',
        'C:\\tools\\nuclei.exe',
        'nuclei.exe',
        'nuclei',
      ]
    : [
        '/usr/local/bin/nuclei',
        '/opt/homebrew/bin/nuclei',
        '/usr/bin/nuclei',
        'nuclei',
      ];

let cachedBin: string | null = null;

async function getNucleiBin(): Promise<string> {
  if (cachedBin) return cachedBin;

  // Сначала пробуем nuclei из PATH
  const defaultBin = process.platform === 'win32' ? 'nuclei.exe' : 'nuclei';
  try {
    await execRaw(defaultBin, ['-version'], 8_000);
    logger.log(`nuclei binary found in PATH: "${defaultBin}"`);
    cachedBin = defaultBin;
    return cachedBin;
  } catch {
    // не в PATH — пробуем fallback-пути
  }

  for (const candidate of FALLBACK_PATHS) {
    try {
      await execRaw(candidate, ['-version'], 8_000);
      logger.log(`nuclei binary: "${candidate}"`);
      cachedBin = candidate;
      return cachedBin;
    } catch (e: any) {
      if (e?.code !== 'ENOENT') {
        logger.log(`nuclei binary (exists): "${candidate}"`);
        cachedBin = candidate;
        return cachedBin;
      }
    }
  }

  const hint =
    process.platform === 'win32'
      ? 'On Windows: download from https://github.com/projectdiscovery/nuclei/releases'
      : 'On macOS: brew install nuclei. On Linux: go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest';

  throw new Error(
    `nuclei not found. Tried:\n${FALLBACK_PATHS.join('\n')}\n\n${hint}`,
  );
}

export async function runNuclei(targetUrl: string, extraArgs?: string) {
  let bin: string;
  try {
    bin = await getNucleiBin();
  } catch (e: any) {
    logger.warn(e.message);
    return { findings: [], error: e.message };
  }

  const args = [
    '-u',
    targetUrl,
    '-jsonl',
    '-no-color',
    '-timeout',
    '10',
    '-retries',
    '1',
  ];

  if (extraArgs) {
    const allowed = extraArgs
      .split(' ')
      .map((x) => x.trim())
      .filter(Boolean)
      .filter(
        (x) =>
          [
            '-severity',
            '-tags',
            '-exclude-tags',
            '-timeout',
            '-retries',
            '-rate-limit',
          ].includes(x) || /^[a-zA-Z0-9_,:-]+$/.test(x),
      );
    args.push(...allowed);
  }

  logger.log(`Running: "${bin}" ${args.join(' ')}`);

  try {
    const { stdout, stderr, code } = await execRaw(bin, args, 600_000);

    // Логируем stderr построчно — там прогресс и ошибки nuclei
    if (stderr?.trim()) {
      const lines = stderr.split('\n').filter((l) => l.trim());
      for (const line of lines.slice(0, 50)) {
        logger.debug(`[nuclei] ${line}`);
      }
      if (lines.length > 50) {
        logger.debug(`[nuclei] ... +${lines.length - 50} more stderr lines`);
      }
    }

    if (code !== 0 && !stdout.trim()) {
      logger.error(
        `nuclei code=${code}, empty stdout. stderr: ${stderr.slice(0, 800)}`,
      );
      return {
        findings: [],
        error: `nuclei exited code=${code}. Check logs for details.`,
      };
    }

    const stdoutLines = stdout.split('\n').filter(Boolean).length;
    logger.log(`nuclei stdout: ${stdoutLines} lines, ${stdout.length} bytes`);

    const findings = parseJsonl(stdout);
    logger.log(`nuclei done: ${findings.length} findings on ${targetUrl}`);

    if (findings.length === 0 && stdoutLines === 0) {
      logger.warn(
        `nuclei returned empty output! ` +
          `Try running manually: "${bin}" -u ${targetUrl} -severity critical,high -no-color`,
      );
    }

    return { findings, error: null };
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    logger.error(`nuclei exception: ${msg}`);
    return { findings: [], error: msg };
  }
}

function parseJsonl(out: string): NucleiFinding[] {
  const lines = out
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('{'));

  const res: NucleiFinding[] = [];

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const sev = normalizeSeverity(obj?.info?.severity);
      const matched = obj?.matched_at ?? obj?.matched ?? null;
      const templateId = obj?.template_id ?? obj?.template ?? '';

      res.push({
        title: obj?.info?.name ?? templateId ?? 'Nuclei finding',
        severity: sev,
        kind: 'nuclei',
        description:
          obj?.info?.description ??
          (matched ? `Matched: ${matched}` : null) ??
          templateId ??
          null,
        evidence: {
          templateId,
          matched,
          type: obj?.type ?? null,
          host: obj?.host ?? null,
          tags: obj?.info?.tags ?? [],
          reference: obj?.info?.reference ?? [],
        },
        remediation: obj?.info?.remediation ?? null,
      });
    } catch {
      // skip non-JSON line
    }
  }

  return res;
}

function normalizeSeverity(s: any): Severity {
  const v = String(s ?? '').toLowerCase();
  if (v === 'critical') return Severity.CRITICAL;
  if (v === 'high') return Severity.HIGH;
  if (v === 'medium') return Severity.MEDIUM;
  if (v === 'low') return Severity.LOW;
  return Severity.INFO;
}

async function execRaw(cmd: string, args: string[], timeoutMs: number) {
  return new Promise<{ stdout: string; stderr: string; code: number }>(
    (resolve, reject) => {
      const child = spawn(cmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });

      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`nuclei timeout after ${timeoutMs / 1000}s`));
      }, timeoutMs);

      child.stdout.on('data', (d) => (stdout += d.toString('utf-8')));
      child.stderr.on('data', (d) => (stderr += d.toString('utf-8')));
      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, code: code ?? -1 });
      });
    },
  );
}
