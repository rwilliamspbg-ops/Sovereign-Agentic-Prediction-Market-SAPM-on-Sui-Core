type PerfCategory = 'load' | 'agent-render' | 'trade-execution';

class PerfStore {
  private metrics = new Map<string, number>();

  set(key: string, duration: number): void {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, Math.max(current, duration));
  }

  topSlowest(limit = 5): Array<[string, number]> {
    return Array.from(this.metrics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }
}

const store = new PerfStore();

export class PerformanceMonitor {
  static track(category: PerfCategory, name: string, durationMs: number): void {
    const key = `${category}:${name}`;
    store.set(key, durationMs);

    if (category === 'load' && durationMs > 5000) {
      console.warn(`Slow initial load detected: ${durationMs}ms (${name})`);
    }
  }

  static getSlowest(): Array<[string, number]> {
    return store.topSlowest(5);
  }
}
