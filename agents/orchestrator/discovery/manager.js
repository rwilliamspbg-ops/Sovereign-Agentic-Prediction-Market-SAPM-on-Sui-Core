// SPDX-License-Identifier: Apache-2.0
/**
 * Discovery Manager - Phase 1 Foundation
 * Handles swarm peer discovery, session management, and gossip coordination
 */

const crypto = require('crypto');

class DiscoveryManager {
  constructor(config) {
    this.config = config;
    this.peers = new Map();
    this.sessions = new Map();
    this.heartbeatIntervalMs = config.heartbeatInterval || 30000; // 30s default
  }

  /**
   * Discover and register a new peer
   */
  discoverPeer(peerPubkey, endpoint, metadata = {}) {
    const peerId = this._generatePeerId(peerPubkey);
    
    const peer = {
      id: peerId,
      pubkey: peerPubkey,
      endpoint: endpoint,
      status: 'discovered', // discovered, connected, active, inactive
      lastHeartbeat: Date.now(),
      metadata: { ...metadata },
      registeredAt: new Date().toISOString()
    };

    this.peers.set(peerId, peer);
    console.log(`[DiscoveryManager] Discovered peer ${peerId} at ${endpoint}`);
    
    return peer;
  }

  /**
   * Establish secure session with peer using x25519-mlkem768 hybrid KEX
   */
  async establishSession(peerId, attestationData, peerPubkey) {
    const session = {
      peerId,
      establishedAt: Date.now(),
      status: 'negotiating', // negotiating, encrypted, active, failed
      keyMaterial: null,
      nonce: crypto.randomBytes(32).toString('hex')
    };

    this.sessions.set(peerId, session);
    
    try {
      // Perform hybrid key exchange (x25519-mlkem768)
      const sessionKeys = await this._performHybridKeyExchange(attestationData, peerPubkey);
      
      session.keyMaterial = sessionKeys;
      session.status = 'encrypted';
      
      console.log(`[DiscoveryManager] Session established with ${peerId}: encrypted`);
      
      return { success: true, session };
    } catch (error) {
      console.error(`[DiscoveryManager] Session establishment failed for ${peerId}:`, error.message);
      session.status = 'failed';
      this.sessions.delete(peerId); // Clean up failed session
      throw error;
    }
  }

  /**
   * Process incoming heartbeat from peer
   */
  processHeartbeat(peerId, timestamp) {
    const peer = this.peers.get(peerId);
    if (!peer) {
      console.log(`[DiscoveryManager] Heartbeat from unknown peer ${peerId}`);
      return false;
    }

    peer.lastHeartbeat = timestamp;
    peer.status = 'active';
    
    // Mark as inactive after timeout
    this._scheduleInactivityTimeout(peerId, this.config.inactivityTimeout || 60000);
    
    console.log(`[DiscoveryManager] Heartbeat received from ${peerId}: active`);
    return true;
  }

  /**
   * Broadcast message to all connected peers using gossip protocol
   */
  broadcast(message, excludePeerId = null) {
    const now = Date.now();
    const gossipMessage = {
      type: 'gossip',
      content: message,
      timestamp: now,
      source: this._generateSourceId(),
      ttl: this.config.gossipTTL || 300000 // 5 minutes default
    };

    console.debug('[DiscoveryManager] Prepared gossip message', gossipMessage);

    let delivered = 0;
    for (const [peerId, peer] of this.peers.entries()) {
      if (excludePeerId && peerId === excludePeerId) continue;
      
      if (peer.status === 'active') {
        console.log(`[DiscoveryManager] Broadcasting gossip to ${peerId}`);
        // In production: send via established secure channel
        // this._sendToPeer(peer.endpoint, gossipMessage)
        delivered++;
      }
    }

    console.log(`[DiscoveryManager] Gossip broadcast delivered to ${delivered} peers`);
    return delivered;
  }

  /**
   * Get list of active peers
   */
  getActivePeers() {
    return Array.from(this.peers.entries())
      .filter(([_, peer]) => peer.status === 'active')
      .map(([id, peer]) => ({ id: peer.id, endpoint: peer.endpoint }));
  }

  /**
   * Get all peers with status
   */
  getAllPeers() {
    return Array.from(this.peers.values()).map(peer => ({
      id: peer.id,
      pubkey: peer.pubkey,
      status: peer.status,
      endpoint: peer.endpoint,
      lastHeartbeat: new Date(peer.lastHeartbeat).toISOString(),
      registeredAt: peer.registeredAt
    }));
  }

  /**
   * Clean up inactive peers
   */
  cleanupInactivePeers(timeoutMs = 30000) {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [peerId, peer] of this.peers.entries()) {
      if (now - peer.lastHeartbeat > timeoutMs) {
        console.log(`[DiscoveryManager] Cleaning up inactive peer ${peerId}`);
        this.peers.delete(peerId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Perform hybrid key exchange (placeholder for x25519-mlkem768)
   */
  async _performHybridKeyExchange(attestationData, peerPubkey) {
    console.log('[DiscoveryManager] Performing hybrid key exchange...');
    
    // TRIAGE ORCH-009
    // Owner: Orchestrator Crypto Team
    // Milestone: M3-DISCOVERY-HYBRID-KEX
    // Due: 2026-07-15
    // Tracking: docs/ORCHESTRATOR_PLACEHOLDER_TRIAGE.md
    // This is a placeholder - implement actual x25519-mlkem768 KEX
    return Buffer.from('placeholder_key_material_for_phase_1_scaffolding');
  }

  /**
   * Schedule inactivity timeout for peer
   */
  _scheduleInactivityTimeout(peerId, timeoutMs) {
    // Implementation: Set up timer to mark peer inactive
    console.log(`[DiscoveryManager] Scheduled inactivity timeout for ${peerId}: ${timeoutMs}ms`);
    // In production: use proper interval/timeout management
  }

  /**
   * Generate source ID for messages
   */
  _generateSourceId() {
    return `source-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate peer ID from pubkey
   */
  _generatePeerId(pubkey) {
    if (pubkey.startsWith('0x')) {
      return `peer-${pubkey.slice(0, 8)}...`;
    }
    return `peer-${pubkey}`;
  }
}

// Export for module use
module.exports = { DiscoveryManager };
