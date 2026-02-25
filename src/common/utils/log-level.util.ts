import { LogLevel } from '@prisma/client';

/**
 * Best-effort mapping from syslog severity or text labels to our enum.
 */
export function normalizeLevel(input?: string | number | null): LogLevel {
  if (input === undefined || input === null) return LogLevel.INFO;

  if (typeof input === 'number') {
    // syslog severity: 0 emerg .. 7 debug
    if (input <= 2) return LogLevel.ERROR;
    if (input === 3) return LogLevel.ERROR;
    if (input === 4) return LogLevel.WARN;
    if (input === 5) return LogLevel.INFO;
    if (input >= 6) return LogLevel.DEBUG;
    return LogLevel.INFO;
  }

  const s = String(input).toLowerCase();
  if (s.includes('fatal')) return LogLevel.FATAL;
  if (s.includes('error') || s.includes('err')) return LogLevel.ERROR;
  if (s.includes('warn')) return LogLevel.WARN;
  if (s.includes('debug')) return LogLevel.DEBUG;
  if (s.includes('trace')) return LogLevel.TRACE;
  return LogLevel.INFO;
}