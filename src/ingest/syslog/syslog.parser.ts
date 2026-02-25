/**
 * Очень простой парсер syslog: вытягиваем host/app/message best-effort.
 * Потом можно улучшить (RFC5424, PRI, timestamps).
 */
export function parseSyslogLine(line: string): {
  host?: string;
  app?: string;
  message: string;
  raw: any;
} {
  // пример: "<34>Feb 24 12:34:56 router sshd[123]: Failed password ..."
  const raw = { line };

  // попробуем найти "app:" после хоста
  const idx = line.indexOf(': ');
  if (idx === -1) return { message: line, raw };

  const left = line.slice(0, idx);
  const message = line.slice(idx + 2);

  // эвристика: последний "токен" слева часто "app[pid]"
  const tokens = left.trim().split(/\s+/);
  const appToken = tokens[tokens.length - 1];
  const hostToken = tokens.length >= 2 ? tokens[tokens.length - 2] : undefined;

  const app = appToken?.replace(/\[.*?\]$/, '');
  const host = hostToken;

  return { host, app, message, raw };
}
