import { spawn } from 'node:child_process';
import { Severity } from '@prisma/client';

type NucleiFinding = {
  title: string;
  severity: Severity;
  kind: string;
  description?: string | null;
  evidence?: any;
  remediation?: string | null;
};

export async function runNuclei(targetUrl: string, extraArgs?: string) {
  // nuclei -u <url> -jsonl
  // extraArgs — очень ограниченно; лучше вообще не использовать, но оставляем для диплома.
  const args = ['-u', targetUrl, '-jsonl'];

  if (extraArgs) {
    // безопасный allowlist токенов (не даём передавать произвольные файлы/команды)
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

  try {
    const { stdout, stderr, code } = await execWithTimeout(
      'nuclei',
      args,
      180_000,
    );
    if (code !== 0) {
      return {
        findings: [],
        error: `nuclei failed (code=${code}): ${stderr.slice(0, 2000)}`,
      };
    }

    const findings = parseJsonl(stdout);
    return { findings, error: null };
  } catch (e: any) {
    // если nuclei не установлен: ENOENT
    const msg = String(e?.message ?? e);
    return { findings: [], error: msg };
  }
}

function parseJsonl(out: string): NucleiFinding[] {
  const lines = out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const res: NucleiFinding[] = [];

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const sev = normalizeSeverity(obj?.info?.severity);
      res.push({
        title: obj?.info?.name ?? 'Nuclei finding',
        severity: sev,
        kind: 'nuclei',
        description: obj?.matched ?? obj?.template ?? null,
        evidence: obj,
        remediation: obj?.info?.remediation ?? null,
      });
    } catch {
      // skip broken line
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

async function execWithTimeout(cmd: string, args: string[], timeoutMs: number) {
  return new Promise<{ stdout: string; stderr: string; code: number }>(
    (resolve, reject) => {
      const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

      let stdout = '';
      let stderr = '';

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`${cmd} timeout after ${timeoutMs}ms`));
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
