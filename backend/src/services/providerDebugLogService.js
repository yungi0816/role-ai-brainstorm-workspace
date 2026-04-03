import { randomUUID } from 'node:crypto';

const MAX_LOGS = 120;
const logs = [];

function compact(value, maxLength = 1200) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => compact(item, maxLength));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 40)
        .map(([key, item]) => {
          if (/key|token|secret|authorization|credential/i.test(key)) {
            return [key, '[redacted]'];
          }

          return [key, compact(item, maxLength)];
        })
    );
  }

  return value;
}

export function recordProviderLog({
  providerId,
  model = null,
  event,
  level = 'info',
  message,
  details = null
}) {
  const entry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    providerId: providerId || 'unknown',
    model,
    event,
    level,
    message,
    details: compact(details)
  };

  logs.unshift(entry);
  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }

  return entry;
}

export function listProviderLogs({ providerId = null, limit = 50 } = {}) {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 50, 1), MAX_LOGS);
  const filteredLogs = providerId
    ? logs.filter((entry) => entry.providerId === providerId)
    : logs;

  return filteredLogs.slice(0, normalizedLimit);
}

export function clearProviderLogs({ providerId = null } = {}) {
  if (!providerId) {
    const removed = logs.length;
    logs.length = 0;
    return { removed };
  }

  let removed = 0;
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    if (logs[index].providerId === providerId) {
      logs.splice(index, 1);
      removed += 1;
    }
  }

  return { removed };
}
