import { spawn } from 'node:child_process';
import { Logger } from '@nestjs/common';

const logger = new Logger('NmapRunner');

/**
 * На Windows nmap может называться nmap.exe и лежать не в системном PATH.
 * Пробуем несколько вариантов.
 */
function getNmapBin(): string {
  if (process.platform === 'win32') {
    return 'nmap.exe';
  }
  return 'nmap';
}

export async function runNmap(targetHost: string): Promise<string> {
  const bin = getNmapBin();

  // -sV: версии сервисов
  // -Pn: не полагаться на ping (на localhost ping обычно работает, но для надёжности)
  // --host-timeout: ограничение времени
  // -oX -: XML в stdout
  const args = ['-sV', '-Pn', '--host-timeout', '120s', '-oX', '-', targetHost];

  logger.log(`Executing: ${bin} ${args.join(' ')}`);

  try {
    const { stdout, stderr, code } = await execWithTimeout(bin, args, 140_000);

    if (code !== 0) {
      throw new Error(`nmap failed (code=${code}): ${stderr.slice(0, 4000)}`);
    }
    if (!stdout || !stdout.includes('<nmaprun')) {
      throw new Error(
        `nmap returned no XML output. stderr=${stderr.slice(0, 4000)}`,
      );
    }
    return stdout;
  } catch (err: any) {
    // ENOENT = binary not found → пробуем полные пути для Windows
    if (err?.code === 'ENOENT' || String(err?.message).includes('ENOENT')) {
      logger.warn(`"${bin}" not found in PATH, trying known Windows paths...`);
      return tryWindowsPaths(args);
    }
    throw err;
  }
}

/**
 * Пробуем стандартные пути установки nmap на Windows
 */
async function tryWindowsPaths(args: string[]): Promise<string> {
  const candidates = [
    'C:\\Program Files (x86)\\Nmap\\nmap.exe',
    'C:\\Program Files\\Nmap\\nmap.exe',
    'C:\\nmap\\nmap.exe',
    'nmap',
  ];

  for (const candidate of candidates) {
    try {
      logger.log(`Trying: "${candidate}"`);
      const { stdout, stderr, code } = await execWithTimeout(
        candidate,
        args,
        140_000,
      );

      if (code === 0 && stdout && stdout.includes('<nmaprun')) {
        logger.log(`nmap found at: "${candidate}"`);
        return stdout;
      }
      if (code !== 0) {
        logger.warn(
          `"${candidate}" returned code=${code}: ${stderr.slice(0, 500)}`,
        );
      }
    } catch (e: any) {
      if (e?.code !== 'ENOENT') {
        // Не ENOENT — реальная ошибка выполнения
        logger.warn(`"${candidate}" error: ${e?.message}`);
      }
      // ENOENT — просто не существует, идём дальше
    }
  }

  throw new Error(
    'nmap binary not found. ' +
      'On Windows: install from https://nmap.org/download.html and ensure it is added to PATH. ' +
      'After installation, restart the backend server.',
  );
}

async function execWithTimeout(cmd: string, args: string[], timeoutMs: number) {
  return new Promise<{ stdout: string; stderr: string; code: number }>(
    (resolve, reject) => {
      const child = spawn(cmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        // На Windows shell: false — spawn напрямую, без cmd.exe
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
