type ObservabilitySeverity = 'info' | 'warn' | 'error';

export type ObservabilityEvent = {
  ts: string;
  category: 'deepbook' | 'walrus' | 'trade' | 'frontend';
  action: string;
  severity: ObservabilitySeverity;
  details?: Record<string, unknown>;
};

function emitToConsole(event: ObservabilityEvent) {
  const payload = JSON.stringify(event);
  if (event.severity === 'error') {
    console.error(payload);
    return;
  }
  if (event.severity === 'warn') {
    console.warn(payload);
    return;
  }
  console.info(payload);
}

export function emitObservabilityEvent(
  category: ObservabilityEvent['category'],
  action: string,
  severity: ObservabilitySeverity = 'info',
  details?: Record<string, unknown>,
) {
  const event: ObservabilityEvent = {
    ts: new Date().toISOString(),
    category,
    action,
    severity,
    details,
  };

  emitToConsole(event);

  if (typeof window !== 'undefined') {
    const state = globalThis as typeof globalThis & { __SAPM_OBSERVABILITY__?: ObservabilityEvent[] };
    const queue = state.__SAPM_OBSERVABILITY__ || [];
    queue.push(event);
    if (queue.length > 500) {
      queue.splice(0, queue.length - 500);
    }
    state.__SAPM_OBSERVABILITY__ = queue;
  }
}
