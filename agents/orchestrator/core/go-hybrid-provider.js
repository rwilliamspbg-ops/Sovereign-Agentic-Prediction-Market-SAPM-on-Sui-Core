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

module.exports = {
  async deriveSession({ attestationDigest, peerPublicKey, algorithm }) {
    const repoRoot = path.resolve(__dirname, '../../..');
    const peerPublicB64 = Buffer.from(peerPublicKey).toString('base64');
    const attestationDigestB64 = Buffer.from(attestationDigest).toString('base64');

    const stdout = await execFilePromise(
      'go',
      [
        'run',
        './cmd/kexcli',
        '-mode', 'derive-session',
        '-peer-public-b64', peerPublicB64,
        '-attestation-digest-b64', attestationDigestB64,
      ],
      { cwd: repoRoot, maxBuffer: 1024 * 1024 },
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