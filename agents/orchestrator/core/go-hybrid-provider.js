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
  lastStartedAt: null,
  lastCompletedAt: null,
  lastDurationMs: null,
  lastErrorCategory: null,
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
  return 'execution_failed';
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
    lastStartedAt: null,
    lastCompletedAt: null,
    lastDurationMs: null,
    lastErrorCategory: null,
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
  resetProviderReadinessCache,
  async deriveSession({ attestationDigest, peerPublicKey, algorithm }) {
    runtimeState.executionMode = (process.env.SAPM_HYBRID_KEX_EXECUTION_MODE || 'per-call').trim() || 'per-call';
    runtimeState.deriveCalls += 1;
    runtimeState.lastStartedAt = new Date().toISOString();
    const startedAtMs = Date.now();

    const peerPublicB64 = Buffer.from(peerPublicKey).toString('base64');
    const attestationDigestB64 = Buffer.from(attestationDigest).toString('base64');
    try {
      await ensureProviderReady();
      const invocation = buildDeriveSessionCommand(peerPublicB64, attestationDigestB64);
      const providerTimeoutMs = Number(process.env.SAPM_HYBRID_KEX_TIMEOUT_MS || 15000);

      const stdout = await execFilePromise(
        invocation.command,
        invocation.args,
        {
          cwd: invocation.cwd,
          maxBuffer: 1024 * 1024,
          timeout: Number.isFinite(providerTimeoutMs) && providerTimeoutMs > 0 ? providerTimeoutMs : 15000,
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

      return {
        algorithm: result.algorithm || algorithm,
        sessionKey: result.sessionKey,
        nonce: result.nonce,
        peerKeyDigest: result.peerKeyDigest,
        proofType: 'hmac-sha256',
      };
    } catch (error) {
      const category = classifyProviderError(error.message);
      runtimeState.lastCompletedAt = new Date().toISOString();
      runtimeState.lastDurationMs = Date.now() - startedAtMs;
      runtimeState.lastErrorCategory = category;
      throw new Error(`Hybrid KEX provider derive-session failed [${category}]: ${error.message}`);
    }
  },
};