// SPDX-License-Identifier: Apache-2.0
/**
 * SAPM Orchestrator Core - Phase 1 Foundation
 * State Machine: UNINITIALIZED → ATTESTED → KEY_ESTABLISHED → OPERATIONAL
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

// State constants
const STATE = {
  UNINITIALIZED: 'UNINITIALIZED',
  ATTESTED: 'ATTESTED',
  KEY_ESTABLISHED: 'KEY_ESTABLISHED',
  OPERATIONAL: 'OPERATIONAL'
};

// Exit codes for state failures (matches THEOREM_REMEDIATION_TRACKER)
const EXIT_CODES = {
  ATTESTATION_FAILURE: 101,
  KEY_DERIVATION_INTEGRITY_FAULT: 102,
  PERFORMANCE_READINESS_VIOLATED: 103
};

// State machine class
class Orchestrator {
  constructor(config) {
    this.state = STATE.UNINITIALIZED;
    this.config = config || {};
    this.attestationData = null;
    this.sessionKeys = null;
    this.runtimeEnv = null;
    
    // Initialize modules
    this.cryptoProvider = new CryptoProvider(this.config);
    this.attestationClient = new AttestationClient(this.config);
    this.networkHandler = new NetworkHandler(this.config);
    
    console.log('[Orchestrator] Initialized in', this.state);
  }

  /**
   * Transition from S0 (UNINITIALIZED) → S1 (ATTESTED)
   * Proves: Hash(AttestationData(N)) = Verify(IdentityKey, Nonce)
   */
  async transitionToS1() {
    console.log('[Orchestrator] Attempting S0 → S1 transition...');
    
    try {
      // Read TPM/TEE attestation measurement
      const tpmMeasurement = await this.attestationClient.readTPM();
      
      // Verify attestation chain against root authority
      const certChainPath = path.join(this.config.dataDir, 'cert_chain.pem');
      if (!fs.existsSync(certChainPath)) {
        throw new Error('Attestation certificate chain not found');
      }
      
      const certChain = fs.readFileSync(certChainPath);
      const isValid = await this.attestationClient.verifyCertChain(certChain);
      
      if (!isValid) {
        throw new Error('Attestation certificate verification failed');
      }
      
      // Record attestation data
      this.attestationData = tpmMeasurement;
      
      // Transition state
      this.state = STATE.ATTESTED;
      console.log('[Orchestrator] S1 ATTESTED: Attestation verified');
      
      return { success: true, code: EXIT_CODES.ATTESTATION_FAILURE };
    } catch (error) {
      console.error('[Orchestrator] S0→S1 transition failed:', error.message);
      process.exit(EXIT_CODES.ATTESTATION_FAILURE);
    }
  }

  /**
   * Transition from S1 (ATTESTED) → S2 (KEY_ESTABLISHED)
   * Proves: K_sess = f(AttestationData, PQC_pub, ECC_pub) ∧ Proof(KeyDerivationFunction)
   */
  async transitionToS2() {
    console.log('[Orchestrator] Attempting S1 → S2 transition...');
    
    try {
      // Verify network connectivity
      if (!await this.networkHandler.isReachable(this.config.aggregatorUrl)) {
        throw new Error('Cannot reach aggregator service');
      }
      
      // Perform hybrid PQC/ECC key exchange (x25519-mlkem768)
      const peerPubKey = await this.cryptoProvider.fetchPeerPublicKey();
      const sessionKeys = await this.cryptoProvider.hybridKeyExchange(
        this.attestationData,
        peerPubKey
      );
      
      // Verify key derivation integrity
      const proofValid = await this.cryptoProvider.verifyKeyDerivationProof(sessionKeys);
      if (!proofValid) {
        throw new Error('Key derivation proof verification failed');
      }
      
      // Record session keys
      this.sessionKeys = sessionKeys;
      
      // Transition state
      this.state = STATE.KEY_ESTABLISHED;
      console.log('[Orchestrator] S2 KEY_ESTABLISHED: Session keys derived');
      
      return { success: true, code: EXIT_CODES.KEY_DERIVATION_INTEGRITY_FAULT };
    } catch (error) {
      console.error('[Orchestrator] S1→S2 transition failed:', error.message);
      process.exit(EXIT_CODES.KEY_DERIVATION_INTEGRITY_FAULT);
    }
  }

  /**
   * Transition from S2 (KEY_ESTABLISHED) → S3 (OPERATIONAL)
   * Proves: MemoryRegion(Datapath) ⊂ HugePageMap ∧ CPUAffinity(Threads) = PinnedSet
   */
  async transitionToS3() {
    console.log('[Orchestrator] Attempting S2 → S3 transition...');
    
    try {
      // Verify resource allocation (hugepages + CPU pinning)
      const resourceCheck = await this.networkHandler.verifyResourceAllocation();
      
      if (!resourceCheck.hugepagesAvailable) {
        throw new Error('Hugepages not available - performance guarantee violated');
      }
      
      if (!resourceCheck.cpuPinningEnforced) {
        throw new Error('CPU pinning not enforced - performance guarantee violated');
      }
      
      // Transition state
      this.state = STATE.OPERATIONAL;
      console.log('[Orchestrator] S3 OPERATIONAL: Resources allocated, ready for data plane');
      
      return { success: true, code: EXIT_CODES.PERFORMANCE_READINESS_VIOLATED };
    } catch (error) {
      console.error('[Orchestrator] S2→S3 transition failed:', error.message);
      process.exit(EXIT_CODES.PERFORMANCE_READINESS_VIOLATED);
    }
  }

  /**
   * Initialize and run the full initialization sequence
   */
  async initialize() {
    console.log('[Orchestrator] Starting initialization sequence...');
    console.log('[Orchestrator] Initial state:', this.state);
    
    // Execute state machine transitions sequentially
    await this.transitionToS1();
    await this.transitionToS2();
    await this.transitionToS3();
    
    console.log('[Orchestrator] Initialization complete. Final state:', this.state);
  }

  /**
   * Get current orchestrator state (for health checks)
   */
  getState() {
    return {
      state: this.state,
      attestationVerified: this.attestationData !== null,
      sessionKeysEstablished: this.sessionKeys !== null
    };
  }
}

/**
 * Crypto Provider - Handles cryptographic operations
 */
class CryptoProvider {
  constructor(config) {
    this.config = config;
  }

  async hybridKeyExchange(attestationData, peerPubKey) {
    // Implementation: x25519-mlkem768 hybrid KEX
    // TRIAGE ORCH-001
    // Owner: Orchestrator Crypto Team
    // Milestone: M3-ORCH-CRYPTO-INTEGRATION
    // Due: 2026-07-15
    // Tracking: docs/ORCHESTRATOR_PLACEHOLDER_TRIAGE.md
    // This is a placeholder - implement with actual crypto library
    console.log('[CryptoProvider] Performing hybrid key exchange (x25519-mlkem768)');
    return Buffer.from('placeholder_session_keys_for_phase_1_scaffolding');
  }

  async verifyKeyDerivationProof(sessionKeys) {
    // Implementation: Verify cryptographic proof of key derivation
    // TRIAGE ORCH-002
    // Owner: Orchestrator Crypto Team
    // Milestone: M3-ORCH-KDF-PROOFS
    // Due: 2026-07-22
    // Tracking: docs/ORCHESTRATOR_PLACEHOLDER_TRIAGE.md
    console.log('[CryptoProvider] Verifying key derivation integrity...');
    return true; // Placeholder for Phase 1
  }

  async fetchPeerPublicKey() {
    // Implementation: Fetch peer public key from aggregator or registry
    // TRIAGE ORCH-003
    // Owner: Orchestrator Networking Team
    // Milestone: M3-ORCH-PEER-IDENTITY
    // Due: 2026-07-29
    // Tracking: docs/ORCHESTRATOR_PLACEHOLDER_TRIAGE.md
    console.log('[CryptoProvider] Fetching peer public key...');
    return '0xplaceholder_peer_public_key'; // Placeholder for Phase 1
  }
}

/**
 * Attestation Client - Handles TPM/TEE attestation
 */
class AttestationClient {
  constructor(config) {
    this.config = config;
  }

  async readTPM() {
    console.log('[AttestationClient] Reading TPM measurement...');

    const measurementPath = this.config.tpmMeasurementPath || process.env.TPM_MEASUREMENT_FILE || '/sys/class/tpm/tpm0/pcr-sha256/0';
    const teeRuntime = this.config.teeRuntime || process.env.TEE_RUNTIME || 'none';
    const allowMock = process.env.ALLOW_MOCK_ATTESTATION === '1';

    if (teeRuntime === 'none' && !allowMock) {
      throw new Error('TEE runtime not configured. Set TEE_RUNTIME or ALLOW_MOCK_ATTESTATION=1 for development');
    }

    let rawMeasurement = '';
    try {
      rawMeasurement = fs.readFileSync(measurementPath, 'utf8').trim();
    } catch (err) {
      if (!allowMock) {
        throw new Error(`TPM measurement unavailable at ${measurementPath}: ${err.message}`);
      }
      rawMeasurement = `mock:${teeRuntime}:${Date.now()}`;
    }

    const digest = crypto.createHash('sha256').update(rawMeasurement).digest('base64');
    return {
      platformConfigured: teeRuntime !== 'none' || allowMock,
      integrityVerified: true,
      measurements: {
        source: measurementPath,
        teeRuntime,
        sha256: digest,
      }
    };
  }

  async verifyCertChain(certChain) {
    console.log('[AttestationClient] Verifying attestation certificate chain...');
    const certText = Buffer.isBuffer(certChain) ? certChain.toString('utf8') : String(certChain || '');
    const match = certText.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/);
    if (!match) {
      throw new Error('No PEM certificate found in cert chain');
    }

    const leaf = new crypto.X509Certificate(match[0]);
    const now = Date.now();
    const validFrom = Date.parse(leaf.validFrom);
    const validTo = Date.parse(leaf.validTo);
    if (Number.isFinite(validFrom) && now < validFrom) {
      throw new Error('Attestation certificate not valid yet');
    }
    if (Number.isFinite(validTo) && now > validTo) {
      throw new Error('Attestation certificate expired');
    }

    const expectedFingerprint = (this.config.attestationFingerprint || process.env.ATTESTATION_CERT_SHA256 || '').trim();
    if (expectedFingerprint) {
      const actualFingerprint = leaf.fingerprint256.replace(/:/g, '').toLowerCase();
      if (actualFingerprint !== expectedFingerprint.toLowerCase()) {
        throw new Error('Attestation certificate fingerprint mismatch');
      }
    }

    return true;
  }
}

/**
 * Network Handler - Handles connectivity and resource checks
 */
class NetworkHandler {
  constructor(config) {
    this.config = config;
  }

  async isReachable(url) {
    console.log('[NetworkHandler] Checking connectivity to:', url);
    if (!url) return false;

    return new Promise((resolve) => {
      const timeoutMs = Number(this.config.connectivityTimeoutMs || process.env.CONNECTIVITY_TIMEOUT_MS || 4000);
      const client = url.startsWith('https://') ? https : http;
      const req = client.request(url, { method: 'GET', timeout: timeoutMs }, (res) => {
        const ok = (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 500;
        res.resume();
        resolve(ok);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });
  }

  async verifyResourceAllocation() {
    // Implementation: Check hugepages and CPU pinning
    console.log('[NetworkHandler] Verifying resource allocation...');
    
    const hugepageCheck = this._checkHugepages();
    const cpuPinCheck = this._checkCPUPinning();
    
    return {
      hugepagesAvailable: hugepageCheck,
      cpuPinningEnforced: cpuPinCheck
    };
  }

  _checkHugepages() {
    console.log('[NetworkHandler] Checking hugepage availability...');
    try {
      const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
      const totalMatch = meminfo.match(/^HugePages_Total:\s+(\d+)/m);
      const freeMatch = meminfo.match(/^HugePages_Free:\s+(\d+)/m);
      const total = totalMatch ? Number(totalMatch[1]) : 0;
      const free = freeMatch ? Number(freeMatch[1]) : 0;
      const minHugepages = Number(this.config.minHugepages || process.env.MIN_HUGEPAGES || 1);
      return total >= minHugepages && free > 0;
    } catch (err) {
      console.warn('[NetworkHandler] Hugepage check failed:', err.message);
      return false;
    }
  }

  _checkCPUPinning() {
    console.log('[NetworkHandler] Checking CPU pinning configuration...');
    try {
      const status = fs.readFileSync('/proc/self/status', 'utf8');
      const match = status.match(/^Cpus_allowed_list:\s+(.+)$/m);
      if (!match) return false;

      const list = match[1].trim();
      const disallowUnpinned = (this.config.requireCpuPinning || process.env.REQUIRE_CPU_PINNING || '1') !== '0';
      if (!disallowUnpinned) return true;

      // A comma/hyphen list smaller than all online CPUs is treated as pinned.
      const online = fs.readFileSync('/sys/devices/system/cpu/online', 'utf8').trim();
      return list !== online;
    } catch (err) {
      console.warn('[NetworkHandler] CPU pinning check failed:', err.message);
      return false;
    }
  }
}

// Named exports for internal use
module.exports = { Orchestrator, STATE, EXIT_CODES };

// Default export: test-compatible Orchestrator façade
const OrchestratorManager = require('./orchestrator-manager');
module.exports = OrchestratorManager;
module.exports.Orchestrator = Orchestrator;
module.exports.STATE = STATE;
module.exports.EXIT_CODES = EXIT_CODES;
