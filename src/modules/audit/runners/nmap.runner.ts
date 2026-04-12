import { spawn } from 'node:child_process';
import { Logger } from '@nestjs/common';

const logger = new Logger('NmapRunner');

function getNmapBin(): string {
  if (process.platform === 'win32') return 'nmap.exe';
  return 'nmap';
}

// Базовые аргументы — пробуем сначала с raw scan, при ошибке fallback на --unprivileged
function buildArgs(targetHost: string, unprivileged = false): string[] {
  const base = ['-sV', '-Pn', '--host-timeout', '120s', '-oX', '-'];
  if (unprivileged) base.splice(0, 0, '--unprivileged');
  base.push(targetHost);
  return base;
}

export async function runNmap(targetHost: string): Promise<string> {
  const bin = getNmapBin();

  logger.log(
    `Executing: ${bin} -sV -Pn --host-timeout 120s -oX - ${targetHost}`,
  );

  try {
    const { stdout, stderr, code } = await execWithTimeout(
      bin,
      buildArgs(targetHost, false),
      140_000,
    );

    if (code !== 0) {
      // Проверяем специфичную ошибку Windows с сетевым интерфейсом
      if (
        stderr.includes('not an ethernet device') ||
        stderr.includes('--unprivileged')
      ) {
        logger.warn(`[nmap] raw scan failed, retrying with --unprivileged...`);
        return runNmapUnprivileged(bin, targetHost);
      }
      throw new Error(`nmap failed (code=${code}): ${stderr.slice(0, 4000)}`);
    }

    if (!stdout || !stdout.includes('<nmaprun')) {
      throw new Error(
        `nmap returned no XML output. stderr=${stderr.slice(0, 4000)}`,
      );
    }

    return stdout;
  } catch (err: any) {
    if (err?.code === 'ENOENT' || String(err?.message).includes('ENOENT')) {
      logger.warn(`"${bin}" not found in PATH, trying known fallback paths...`);
      return tryFallbackPaths(targetHost);
    }
    throw err;
  }
}

async function runNmapUnprivileged(
  bin: string,
  targetHost: string,
): Promise<string> {
  const args = buildArgs(targetHost, true);
  logger.log(`Executing: ${bin} ${args.join(' ')}`);

  const { stdout, stderr, code } = await execWithTimeout(bin, args, 140_000);

  if (code !== 0) {
    throw new Error(
      `nmap --unprivileged failed (code=${code}): ${stderr.slice(0, 4000)}`,
    );
  }
  if (!stdout || !stdout.includes('<nmaprun')) {
    throw new Error(
      `nmap --unprivileged returned no XML. stderr=${stderr.slice(0, 4000)}`,
    );
  }

  return stdout;
}

async function tryFallbackPaths(targetHost: string): Promise<string> {
  const candidates =
    process.platform === 'win32'
      ? [
          'C:\\Program Files (x86)\\Nmap\\nmap.exe',
          'C:\\Program Files\\Nmap\\nmap.exe',
          'C:\\nmap\\nmap.exe',
          'nmap',
        ]
      : [
          '/opt/homebrew/bin/nmap',
          '/usr/local/bin/nmap',
          '/usr/bin/nmap',
          'nmap',
        ];

  for (const candidate of candidates) {
    try {
      logger.log(`Trying: "${candidate}"`);

      // Сначала без --unprivileged
      let result = await execWithTimeout(
        candidate,
        buildArgs(targetHost, false),
        140_000,
      );

      if (
        result.code !== 0 &&
        (result.stderr.includes('not an ethernet device') ||
          result.stderr.includes('--unprivileged'))
      ) {
        logger.warn(`[nmap] retrying with --unprivileged for "${candidate}"`);
        result = await execWithTimeout(
          candidate,
          buildArgs(targetHost, true),
          140_000,
        );
      }

      if (
        result.code === 0 &&
        result.stdout &&
        result.stdout.includes('<nmaprun')
      ) {
        logger.log(`nmap found at: "${candidate}"`);
        return result.stdout;
      }
    } catch (e: any) {
      if (e?.code !== 'ENOENT') {
        logger.warn(`"${candidate}" error: ${e?.message}`);
      }
    }
  }

  const hint =
    process.platform === 'win32'
      ? 'On Windows: install from https://nmap.org/download.html and ensure it is added to PATH.'
      : 'On macOS: brew install nmap. On Linux: sudo apt install nmap.';

  throw new Error(
    `nmap binary not found. ${hint} After installation, restart the backend server.`,
  );
}

async function execWithTimeout(cmd: string, args: string[], timeoutMs: number) {
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
