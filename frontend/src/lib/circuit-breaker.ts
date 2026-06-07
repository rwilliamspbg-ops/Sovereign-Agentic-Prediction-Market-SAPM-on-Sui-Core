export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export type CircuitBreakerOptions = {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls?: number;
};

export class CircuitBreakerOpenError extends Error {
  constructor(message = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private openedAt = 0;
  private halfOpenCalls = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  getState(): CircuitBreakerState {
    return this.state;
  }

  async execute<T>(action: () => Promise<T>): Promise<T> {
    this.maybeTransitionToHalfOpen();

    if (this.state === 'open') {
      throw new CircuitBreakerOpenError();
    }

    if (this.state === 'half-open') {
      const allowedCalls = this.options.halfOpenMaxCalls ?? 1;
      if (this.halfOpenCalls >= allowedCalls) {
        throw new CircuitBreakerOpenError('Circuit breaker is half-open and retry capacity is exhausted');
      }
      this.halfOpenCalls += 1;
    }

    try {
      const result = await action();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private maybeTransitionToHalfOpen(): void {
    if (this.state !== 'open') {
      return;
    }

    const elapsed = Date.now() - this.openedAt;
    if (elapsed >= this.options.resetTimeoutMs) {
      this.state = 'half-open';
      this.halfOpenCalls = 0;
    }
  }

  private recordSuccess(): void {
    this.failureCount = 0;
    this.halfOpenCalls = 0;
    this.state = 'closed';
  }

  private recordFailure(): void {
    this.failureCount += 1;
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'open';
      this.openedAt = Date.now();
      this.halfOpenCalls = 0;
    } else if (this.state === 'half-open') {
      this.state = 'open';
      this.openedAt = Date.now();
      this.halfOpenCalls = 0;
    }
  }
}
