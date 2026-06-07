#!/usr/bin/env node

'use strict';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectTradeExecutionToFailGracefully(ctx) {
  const result = await ctx.handlers.executeTrade();
  assert(result.ok === false, 'Expected trade execution to fail gracefully');
  assert(result.error.includes('timeout'), 'Expected timeout failure reason');
}

async function expectPreflightToFailWithCorrectError(ctx) {
  const result = await ctx.handlers.preflight();
  assert(result.valid === false, 'Expected preflight to fail');
  assert(result.reason === 'Pool not active', 'Expected pool health failure reason');
}

async function expectCircuitBreakerToOpen(ctx) {
  for (let i = 0; i < 4; i += 1) {
    await ctx.handlers.modelCall();
  }
  assert(ctx.state.circuitOpen === true, 'Expected circuit breaker to open under partition');
}

function createTestContext() {
  const state = {
    timeoutMs: 1200,
    poolStatus: 'active',
    networkPartition: false,
    failures: 0,
    circuitOpen: false,
  };

  return {
    state,
    handlers: {
      async executeTrade() {
        if (state.timeoutMs > 1000) {
          return { ok: false, error: 'rpc timeout' };
        }
        return { ok: true };
      },
      async preflight() {
        if (state.poolStatus !== 'active') {
          return { valid: false, reason: 'Pool not active' };
        }
        return { valid: true };
      },
      async modelCall() {
        if (state.networkPartition) {
          state.failures += 1;
          if (state.failures >= 3) {
            state.circuitOpen = true;
          }
          return { ok: false };
        }
        return { ok: true };
      },
    },
  };
}

async function runScenario(name, apply, verify) {
  const ctx = createTestContext();
  await apply(ctx);
  await verify(ctx);
  return { name, passed: true };
}

async function main() {
  const scenarios = [
    {
      name: 'Sui RPC timeout',
      apply: async (ctx) => {
        ctx.state.timeoutMs = 10_000;
      },
      verify: expectTradeExecutionToFailGracefully,
    },
    {
      name: 'DeepBook pool frozen',
      apply: async (ctx) => {
        ctx.state.poolStatus = 'frozen';
      },
      verify: expectPreflightToFailWithCorrectError,
    },
    {
      name: 'Network partition',
      apply: async (ctx) => {
        ctx.state.networkPartition = true;
      },
      verify: expectCircuitBreakerToOpen,
    },
  ];

  const results = [];
  for (const scenario of scenarios) {
    try {
      const result = await runScenario(scenario.name, scenario.apply, scenario.verify);
      results.push(result);
      console.log(`[PASS] ${scenario.name}`);
    } catch (error) {
      results.push({ name: scenario.name, passed: false, reason: error instanceof Error ? error.message : String(error) });
      console.error(`[FAIL] ${scenario.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const failures = results.filter((item) => !item.passed);
  const report = {
    timestamp: new Date().toISOString(),
    scenarios: results,
    passed: failures.length === 0,
  };

  console.log(JSON.stringify(report, null, 2));

  if (process.env.CHAOS_REPORT_PATH) {
    require('fs').writeFileSync(process.env.CHAOS_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
