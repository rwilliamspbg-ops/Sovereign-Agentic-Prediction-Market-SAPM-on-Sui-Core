// SPDX-License-Identifier: Apache-2.0

'use strict';

const path = require('path');
const { execFile } = require('child_process');

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

module.exports = {
  buildDeriveSessionCommand,
  async deriveSession({ attestationDigest, peerPublicKey, algorithm }) {
    const peerPublicB64 = Buffer.from(peerPublicKey).toString('base64');
    const attestationDigestB64 = Buffer.from(attestationDigest).toString('base64');
    const invocation = buildDeriveSessionCommand(peerPublicB64, attestationDigestB64);

    const stdout = await execFilePromise(
      invocation.command,
      invocation.args,
      { cwd: invocation.cwd, maxBuffer: 1024 * 1024 },
    );

    const result = JSON.parse(stdout.trim());
    return {
      algorithm: result.algorithm || algorithm,
      sessionKey: result.sessionKey,
      nonce: result.nonce,
      peerKeyDigest: result.peerKeyDigest,
      proofType: 'hmac-sha256',
    };
  },
};