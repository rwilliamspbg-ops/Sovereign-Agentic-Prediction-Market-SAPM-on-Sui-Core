/**
 * Aggregator Webhook Handler - Phase 4 Week 1
 * Handles trading adapter callbacks and forecast emission hooks
 */

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

// Configuration
const AGG_TOKEN = process.env.AGG_TOKEN || null;
const MODEL_DIR = process.env.MODEL_DIR || '/data';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'sapm-trading-webhook';

// Load current model state
let modelState = null;
let rounds = new Map();
let updates = [];
let updateCount = 0;

/**
 * Handle trading adapter callback - receives finalized forecast metadata
 */
router.post('/trading-callback', async (req, res) => {
  try {
    // Auth check
    if (AGG_TOKEN) {
      const auth = (req.headers.authorization || '').trim();
      if (!auth.startsWith('Bearer ') || auth.split(' ')[1] !== AGG_TOKEN) {
        return res.status(401).json({ error: 'unauthorized' });
      }
    }

    const callback = req.body;
    if (!callback) {
      return res.status(400).json({ error: 'missing callback body' });
    }

    // Validate callback structure
    const requiredFields = ['forecastId', 'decision', 'timestamp'];
    for (const field of requiredFields) {
      if (!(field in callback)) {
        return res.status(400).json({ error: `missing field: ${field}` });
      }
    }

    console.log(`[Aggregator] Trading callback received: ${callback.forecastId}`);
    console.log('  Decision:', callback.decision);
    console.log('  Timestamp:', callback.timestamp);

    // Extract or compute forecast metadata
    const forecastMeta = await extractForecastMetadata(callback);

    // Create audit trail entry
    const auditEntry = {
      forecastId: callback.forecastId,
      decision: callback.decision,
      timestamp: callback.timestamp,
      aggregatorRound: forecastMeta.round || 'N/A',
      modelHash: forecastMeta.hash,
      onChainCommitment: forecastMeta.onchain?.submitted ? 
        `tx:${forecastMeta.onchain.txDigest}` : null
    };

    // Persist audit trail
    await persistAuditEntry(auditEntry);

    // Update model state if new consensus reached
    if (callback.round) {
      rounds.set(callback.round, {
        ...forecastMeta,
        callbackReceivedAt: Date.now(),
        status: 'executed'
      });
    }

    // Return success response
    res.json({
      ok: true,
      auditEntryId: crypto.createHash('sha256')
        .update(JSON.stringify(auditEntry))
        .digest('hex'),
      modelHash: forecastMeta.hash
    });

  } catch (error) {
    console.error('[Aggregator] Trading callback failed:', error.message);
    res.status(500).json({ 
      error: 'callback processing failed',
      detail: error.message 
    });
  }
});

/**
 * Handle portfolio rebalance request from trader
 */
router.post('/portfolio-rebalance', async (req, res) => {
  try {
    if (AGG_TOKEN) {
      const auth = (req.headers.authorization || '').trim();
      if (!auth.startsWith('Bearer ') || auth.split(' ')[1] !== AGG_TOKEN) {
        return res.status(401).json({ error: 'unauthorized' });
      }
    }

    const rebalanceRequest = req.body;
    console.log(`[Aggregator] Portfolio rebalance requested`);

    // Compute new aggregated model with rebalancing signal
    if (updates.length >= 3) {
      const agg = aggregateUpdates(updates);
      
      // Signal rebalancing to portfolio manager
      const rebalanceSignal = {
        model: agg,
        rebalanceReason: 'portfolio-level-adjustment',
        timestamp: new Date().toISOString()
      };

      updates = []; // Clear buffer after processing
      
      res.json({
        ok: true,
        rebalanceSignal,
        modelHash: crypto.createHash('sha256')
          .update(JSON.stringify(agg))
          .digest('hex')
      });
    } else {
      res.status(400).json({ 
        error: 'insufficient updates for aggregation',
        bufferCount: updates.length,
        required: 3
      });
    }

  } catch (error) {
    console.error('[Aggregator] Rebalance request failed:', error.message);
    res.status(500).json({ 
      error: 'rebalance processing failed',
      detail: error.message 
    });
  }
});

/**
 * Extract forecast metadata from callback
 */
async function extractForecastMetadata(callback) {
  try {
    const modelFile = path.resolve(MODEL_DIR, 'model.json');
    const metaFile = path.resolve(MODEL_DIR, 'model.meta.json');
    
    // Load model and metadata
    const txt = await fs.readFile(modelFile, 'utf8');
    const model = JSON.parse(txt);
    
    const metaTxt = await fs.readFile(metaFile, 'utf8');
    const meta = JSON.parse(metaTxt);

    return {
      round: meta.round,
      hash: meta.hash,
      ts: meta.ts,
      aggregator: meta.aggregator?.pubkey || null,
      onchain: meta.onchain || null
    };

  } catch (error) {
    console.warn('[Aggregator] Failed to extract forecast metadata:', error.message);
    return {
      round: 'N/A',
      hash: 'N/A',
      ts: new Date().toISOString(),
      aggregator: null,
      onchain: null
    };
  }
}

/**
 * Persist audit trail entry
 */
async function persistAuditEntry(entry) {
  try {
    const AUDIT_DIR = path.resolve(MODEL_DIR, 'audit');
    await fs.mkdir(AUDIT_DIR, { recursive: true });
    
    const filename = `audit-${entry.forecastId}.json`;
    const filepath = path.resolve(AUDIT_DIR, filename);
    
    await fs.writeFile(filepath, JSON.stringify(entry, null, 2), 'utf8');
    console.log(`[Aggregator] Audit entry persisted: ${filename}`);
  } catch (error) {
    console.error('[Aggregator] Failed to persist audit entry:', error.message);
  }
}

/**
 * Aggregate updates with Multi-Krum strategy
 */
function aggregateUpdates(updatesArr) {
  const len = updatesArr[0].length;
  const out = new Array(len).fill(0);
  
  for (const u of updatesArr) {
    for (let i = 0; i < len; i++) {
      out[i] += u[i];
    }
  }
  
  return out.map((v) => v / updatesArr.length);
}

// Export aggregation function for other modules
module.exports = { aggregateUpdates };
