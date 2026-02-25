import { spawn } from 'node:child_process';

export async function runNmap(targetHost: string): Promise<string> {
  // Важно: только безопасные флаги и без “агрессивных” эксплойтов.
  // -sV: версии сервисов
  // -Pn: не полагаться на ping
  // --host-timeout: ограничение времени
  // -oX - : XML в stdout
  const args = ['-sV', '-Pn', '--host-timeout', '120s', '-oX', '-', targetHost];

  const { stdout, stderr, code } = await execWithTimeout('nmap', args, 140_000);

  if (code !== 0) {
    throw new Error(`nmap failed (code=${code}): ${stderr.slice(0, 4000)}`);
  }
  if (!stdout || !stdout.includes('<nmaprun')) {
    throw new Error(
      `nmap returned no XML output. stderr=${stderr.slice(0, 4000)}`,
    );
  }
  return stdout;
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
