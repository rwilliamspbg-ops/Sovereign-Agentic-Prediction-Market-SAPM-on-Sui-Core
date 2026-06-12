// SPDX-License-Identifier: Apache-2.0

'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

let readinessState = {
  key: '',
  promise: null,
  status: null,
};

let runtimeState = {
  executionMode: (process.env.SAPM_HYBRID_KEX_EXECUTION_MODE || 'per-call').trim() || 'per-call',
  deriveCalls: 0,
  deriveAttempts: 0,
  recoveryAttempts: 0,
  lastRecoveryAction: null,
  lastStartedAt: null,
  lastCompletedAt: null,
  lastDurationMs: null,
  lastErrorCategory: null,
};

let lifecycleState = {
  active: false,
  startedAt: null,
  lastStoppedAt: null,
  lastStopReason: null,
  lastHealthCheckAt: null,
  lastHealthStatus: 'unknown',
  restartWindowStartedAt: null,
  restartsInWindow: 0,
  restartBudgetMax: Number(process.env.SAPM_HYBRID_KEX_RESTART_BUDGET_MAX || 3),
  restartBudgetWindowMs: Number(process.env.SAPM_HYBRID_KEX_RESTART_BUDGET_WINDOW_MS || 60000),
  restartBudgetExceeded: false,
};

function execFilePromise(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr?.trim() || error.message));
        return;
      }
      resolve(stdout);
    });
  });
}

function resolveProviderInvocation() {
  const repoRoot = path.resolve(__dirname, '../../..');
  const configuredBinary = (process.env.SAPM_HYBRID_KEX_BINARY || '').trim();

  if (configuredBinary) {
    return {
      command: configuredBinary,
      argsPrefix: [],
      cwd: repoRoot,
    };
  }

  return {
    command: 'go',
    argsPrefix: ['run', './cmd/kexcli'],
    cwd: repoRoot,
  };
}

function buildDeriveSessionCommand(peerPublicB64, attestationDigestB64) {
  const invocation = resolveProviderInvocation();
  return {
    command: invocation.command,
    args: [
      ...invocation.argsPrefix,
      '-mode', 'derive-session',
      '-peer-public-b64', peerPublicB64,
      '-attestation-digest-b64', attestationDigestB64,
    ],
    cwd: invocation.cwd,
  };
}

function resolveInvocationKey(invocation) {
  return `${invocation.command}::${invocation.argsPrefix.join(' ')}`;
}

async function runReadinessChecks(invocation) {
  if (invocation.command === 'go') {
    await execFilePromise('go', ['version'], {
      cwd: invocation.cwd,
      maxBuffer: 256 * 1024,
    });
    return {
      mode: 'go-run',
      command: 'go',
    };
  }

  const command = invocation.command;
  if (command.includes(path.sep) || command.startsWith('.')) {
    const resolvedBinary = path.isAbsolute(command)
      ? command
      : path.resolve(invocation.cwd, command);
    await fs.promises.access(resolvedBinary, fs.constants.X_OK);
    return {
      mode: 'binary-path',
      command: resolvedBinary,
    };
  }

  await execFilePromise('which', [command], {
    cwd: invocation.cwd,
    maxBuffer: 256 * 1024,
  });
  return {
    mode: 'binary-name',
    command,
  };
}

async function ensureProviderReady() {
  const invocation = resolveProviderInvocation();
  const key = resolveInvocationKey(invocation);

  if (readinessState.key === key && readinessState.promise) {
    return readinessState.promise;
  }

  readinessState = {
    key,
    promise: runReadinessChecks(invocation)
      .then((result) => {
        readinessState.status = {
          ok: true,
          checkedAt: new Date().toISOString(),
          key,
          ...result,
        };
        return result;
      })
      .catch((error) => {
        readinessState = {
          key: '',
          promise: null,
          status: {
            ok: false,
            checkedAt: new Date().toISOString(),
            key,
            error: error.message,
          },
        };
        throw new Error(`Hybrid KEX provider readiness check failed: ${error.message}`);
      }),
    status: readinessState.status,
  };

  return readinessState.promise;
}

function classifyProviderError(message) {
  const text = String(message || '').toLowerCase();
  if (text.includes('readiness check failed')) return 'readiness_failed';
  if (text.includes('invalid json')) return 'invalid_json_response';
  if (text.includes('missing required fields')) return 'invalid_payload';
  if (text.includes('timed out')) return 'timeout';
  if (text.includes('restart budget exceeded')) return 'restart_budget_exceeded';
  return 'execution_failed';
}

function canRetryProviderError(category) {
  return category === 'readiness_failed'
    || category === 'execution_failed'
    || category === 'timeout';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getLifecycleConfig() {
  const configuredBudgetMax = Number(process.env.SAPM_HYBRID_KEX_RESTART_BUDGET_MAX || 3);
  const configuredBudgetWindowMs = Number(process.env.SAPM_HYBRID_KEX_RESTART_BUDGET_WINDOW_MS || 60000);
  return {
    restartBudgetMax: Number.isFinite(configuredBudgetMax) && configuredBudgetMax >= 0 ? configuredBudgetMax : 3,
    restartBudgetWindowMs: Number.isFinite(configuredBudgetWindowMs) && configuredBudgetWindowMs > 0
      ? configuredBudgetWindowMs
      : 60000,
  };
}

async function startProviderLifecycle() {
  const config = getLifecycleConfig();
  lifecycleState.restartBudgetMax = config.restartBudgetMax;
  lifecycleState.restartBudgetWindowMs = config.restartBudgetWindowMs;

  if (lifecycleState.active) {
    return getProviderLifecycleState();
  }

  await ensureProviderReady();
  const nowIso = new Date().toISOString();
  lifecycleState.active = true;
  lifecycleState.startedAt = nowIso;
  lifecycleState.lastHealthCheckAt = nowIso;
  lifecycleState.lastHealthStatus = 'healthy';
  lifecycleState.restartBudgetExceeded = false;
  return getProviderLifecycleState();
}

async function healthCheckProviderLifecycle() {
  const nowIso = new Date().toISOString();
  try {
    await ensureProviderReady();
    lifecycleState.lastHealthCheckAt = nowIso;
    lifecycleState.lastHealthStatus = 'healthy';
    return {
      ok: true,
      checkedAt: nowIso,
    };
  } catch (error) {
    lifecycleState.lastHealthCheckAt = nowIso;
    lifecycleState.lastHealthStatus = 'unhealthy';
    return {
      ok: false,
      checkedAt: nowIso,
      error: error.message,
    };
  }
}

function stopProviderLifecycle(reason = 'manual') {
  lifecycleState.active = false;
  lifecycleState.lastStoppedAt = new Date().toISOString();
  lifecycleState.lastStopReason = String(reason || 'manual');
  readinessState = {
    key: '',
    promise: null,
    status: null,
  };
  return getProviderLifecycleState();
}

function getProviderLifecycleState() {
  return {
    ...lifecycleState,
  };
}

function registerProviderRestartOrThrow() {
  const config = getLifecycleConfig();
  lifecycleState.restartBudgetMax = config.restartBudgetMax;
  lifecycleState.restartBudgetWindowMs = config.restartBudgetWindowMs;

  const now = Date.now();
  if (!lifecycleState.restartWindowStartedAt || now - lifecycleState.restartWindowStartedAt > lifecycleState.restartBudgetWindowMs) {
    lifecycleState.restartWindowStartedAt = now;
    lifecycleState.restartsInWindow = 0;
  }

  lifecycleState.restartsInWindow += 1;
  if (lifecycleState.restartsInWindow > lifecycleState.restartBudgetMax) {
    lifecycleState.restartBudgetExceeded = true;
    throw new Error(
      `Hybrid KEX provider restart budget exceeded (${lifecycleState.restartsInWindow}/${lifecycleState.restartBudgetMax}) within ${lifecycleState.restartBudgetWindowMs}ms`,
    );
  }
}

function validateProviderResponse(result) {
  const missing = [];
  if (!result || typeof result !== 'object') {
    throw new Error('Hybrid KEX provider response missing required fields: sessionKey, nonce, peerKeyDigest');
  }
  if (!result.sessionKey) missing.push('sessionKey');
  if (!result.nonce) missing.push('nonce');
  if (!result.peerKeyDigest) missing.push('peerKeyDigest');
  if (missing.length > 0) {
    throw new Error(`Hybrid KEX provider response missing required fields: ${missing.join(', ')}`);
  }
}

function getProviderRuntimeState() {
  return {
    ...runtimeState,
  };
}

function resetProviderReadinessCache() {
  readinessState = {
    key: '',
    promise: null,
    status: null,
  };
  runtimeState = {
    executionMode: (process.env.SAPM_HYBRID_KEX_EXECUTION_MODE || 'per-call').trim() || 'per-call',
    deriveCalls: 0,
    deriveAttempts: 0,
    recoveryAttempts: 0,
    lastRecoveryAction: null,
    lastStartedAt: null,
    lastCompletedAt: null,
    lastDurationMs: null,
    lastErrorCategory: null,
  };
}

function resetProviderLifecycleState() {
  lifecycleState = {
    active: false,
    startedAt: null,
    lastStoppedAt: null,
    lastStopReason: null,
    lastHealthCheckAt: null,
    lastHealthStatus: 'unknown',
    restartWindowStartedAt: null,
    restartsInWindow: 0,
    restartBudgetMax: Number(process.env.SAPM_HYBRID_KEX_RESTART_BUDGET_MAX || 3),
    restartBudgetWindowMs: Number(process.env.SAPM_HYBRID_KEX_RESTART_BUDGET_WINDOW_MS || 60000),
    restartBudgetExceeded: false,
  };
}

function getProviderReadinessStatus() {
  return readinessState.status ? { ...readinessState.status } : null;
}

module.exports = {
  buildDeriveSessionCommand,
  ensureProviderReady,
  getProviderReadinessStatus,
  getProviderRuntimeState,
  getProviderLifecycleState,
  startProviderLifecycle,
  healthCheckProviderLifecycle,
  stopProviderLifecycle,
  resetProviderLifecycleState,
  resetProviderReadinessCache,
  async deriveSession({ attestationDigest, peerPublicKey, algorithm }) {
    runtimeState.executionMode = (process.env.SAPM_HYBRID_KEX_EXECUTION_MODE || 'per-call').trim() || 'per-call';
    runtimeState.deriveCalls += 1;
    runtimeState.lastStartedAt = new Date().toISOString();
    runtimeState.lastRecoveryAction = null;
    const startedAtMs = Date.now();

    const peerPublicB64 = Buffer.from(peerPublicKey).toString('base64');
    const attestationDigestB64 = Buffer.from(attestationDigest).toString('base64');
    const providerTimeoutMs = Number(process.env.SAPM_HYBRID_KEX_TIMEOUT_MS || 15000);
    const timeoutMs = Number.isFinite(providerTimeoutMs) && providerTimeoutMs > 0 ? providerTimeoutMs : 15000;
    const configuredMaxRetries = Number(process.env.SAPM_HYBRID_KEX_MAX_RETRIES || 1);
    const maxRetries = Number.isFinite(configuredMaxRetries) && configuredMaxRetries >= 0 ? configuredMaxRetries : 1;
    const configuredBackoffMs = Number(process.env.SAPM_HYBRID_KEX_RETRY_BACKOFF_MS || 50);
    const retryBackoffMs = Number.isFinite(configuredBackoffMs) && configuredBackoffMs >= 0 ? configuredBackoffMs : 50;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      runtimeState.deriveAttempts += 1;

      try {
        await startProviderLifecycle();
        const invocation = buildDeriveSessionCommand(peerPublicB64, attestationDigestB64);

        const stdout = await execFilePromise(
          invocation.command,
          invocation.args,
          {
            cwd: invocation.cwd,
            maxBuffer: 1024 * 1024,
            timeout: timeoutMs,
          },
        );

        let result;
        try {
          result = JSON.parse(stdout.trim());
        } catch (err) {
          throw new Error(`Hybrid KEX provider returned invalid JSON payload: ${err.message}`);
        }

        validateProviderResponse(result);

        runtimeState.lastCompletedAt = new Date().toISOString();
        runtimeState.lastDurationMs = Date.now() - startedAtMs;
        runtimeState.lastErrorCategory = null;

        if (attempt > 0) {
          runtimeState.lastRecoveryAction = `retry_succeeded_after_${attempt}`;
        }

        return {
          algorithm: result.algorithm || algorithm,
          sessionKey: result.sessionKey,
          nonce: result.nonce,
          peerKeyDigest: result.peerKeyDigest,
          proofType: 'hmac-sha256',
        };
      } catch (error) {
        const category = classifyProviderError(error.message);
        const canRetry = attempt < maxRetries && canRetryProviderError(category);

        if (canRetry) {
          try {
            registerProviderRestartOrThrow();
          } catch (restartError) {
            const restartCategory = classifyProviderError(restartError.message);
            runtimeState.lastCompletedAt = new Date().toISOString();
            runtimeState.lastDurationMs = Date.now() - startedAtMs;
            runtimeState.lastErrorCategory = restartCategory;
            throw new Error(`Hybrid KEX provider derive-session failed [${restartCategory}]: ${restartError.message}`);
          }

          runtimeState.recoveryAttempts += 1;
          runtimeState.lastRecoveryAction = `retry_${attempt + 1}_after_${category}`;
          stopProviderLifecycle(`retry-after-${category}`);

          if (retryBackoffMs > 0) {
            await sleep(retryBackoffMs);
          }
          continue;
        }

        runtimeState.lastCompletedAt = new Date().toISOString();
        runtimeState.lastDurationMs = Date.now() - startedAtMs;
        runtimeState.lastErrorCategory = category;
        throw new Error(`Hybrid KEX provider derive-session failed [${category}]: ${error.message}`);
      }
    }
  },
};