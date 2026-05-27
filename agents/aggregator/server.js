const express = require('express')
const bodyParser = require('body-parser')
const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')
const nacl = require('tweetnacl')
const https = require('https')
const client = require('prom-client')
const { SuiClient } = require('@mysten/sui/client')

const PORT = Number(process.env.PORT || 4000)
const MODEL_DIR = process.env.MODEL_DIR || '/data'
const MODEL_FILE = path.resolve(MODEL_DIR, 'model.json')
const META_FILE = path.resolve(MODEL_DIR, 'model.meta.json')
const AGG_COUNT = Number(process.env.AGGREGATE_COUNT || 3)
const AGG_TOKEN = process.env.AGG_TOKEN || null
const TTL_MS = Number(process.env.UPDATE_TTL_MS || 1000 * 60 * 5) // 5 minutes default
const SEEN_CACHE_LIMIT = Number(process.env.SEEN_CACHE_LIMIT || 10000)
const REGISTRY_FILE = path.resolve(MODEL_DIR, 'registry.json')
const SEEN_FILE = path.resolve(MODEL_DIR, 'seen.json')
const SUI_RPC = process.env.SUI_RPC || 'http://sui-local:9000'
const PUBKEY_REGISTRY_OBJ = process.env.PUBKEY_REGISTRY_OBJ || null

// On-chain registry cache
let registryCache = null
let registryCacheTs = 0
const REGISTRY_CACHE_TTL_MS = Number(process.env.REGISTRY_CACHE_TTL_MS || 30_000)

let updates = []
let model = null
let allowedPubkeys = new Set()
let seen = new Set()

// Prometheus metrics
const register = new client.Registry()
client.collectDefaultMetrics({ register })
const updatesReceived = new client.Counter({ name: 'sapm_aggregator_updates_received_total', help: 'Total updates received', registers: [register] })
const updatesAggregated = new client.Counter({ name: 'sapm_aggregator_updates_aggregated_total', help: 'Total aggregations performed', registers: [register] })
const lastAggregationTs = new client.Gauge({ name: 'sapm_aggregator_last_aggregation_ts', help: 'Last aggregation timestamp', registers: [register] })

async function defaultModel() {
  return Array.from({ length: 10 }, () => 0)
}

async function loadModel() {
  try {
    const txt = await fs.readFile(MODEL_FILE, 'utf8')
    model = JSON.parse(txt)
  } catch (e) {
    model = await defaultModel()
    await saveModel()
  }
  // load registry
  try {
    const rtxt = await fs.readFile(REGISTRY_FILE, 'utf8')
    const arr = JSON.parse(rtxt || '[]')
    allowedPubkeys = new Set(arr)
  } catch (e) {
    allowedPubkeys = new Set()
    await saveRegistry()
  }
  // load seen
  try {
    const stxt = await fs.readFile(SEEN_FILE, 'utf8')
    const arr = JSON.parse(stxt || '[]')
    seen = new Set(arr)
  } catch (e) {
    seen = new Set()
    await persistSeen()
  }
}

async function fetchOnchainRegistry() {
  if (!PUBKEY_REGISTRY_OBJ) return null
  const now = Date.now()
  if (registryCache && (now - registryCacheTs) < REGISTRY_CACHE_TTL_MS) return registryCache
  try {
    const sui = new SuiClient({ url: SUI_RPC })
    const obj = await sui.request({ method: 'sui_getObject', params: [PUBKEY_REGISTRY_OBJ] })
    const txt = JSON.stringify(obj || {})
    // Simple heuristic: find any base64/hex pubkeys in object text and return as set
    // This is opportunistic: it works for registry objects that include pubkeys in plaintext.
    const matches = []
    // look for base64-like strings (rough)
    const re = /[A-Za-z0-9+/=]{32,88}/g
    let m
    while ((m = re.exec(txt))) {
      matches.push(m[0])
    }
    registryCache = new Set(matches)
    registryCacheTs = now
    return registryCache
  } catch (e) {
    console.warn('Failed to fetch on-chain registry:', e?.message || e)
    return null
  }
}

async function saveModel() {
  await fs.mkdir(MODEL_DIR, { recursive: true })
  await fs.writeFile(MODEL_FILE, JSON.stringify(model, null, 2), 'utf8')
  const meta = { hash: crypto.createHash('sha256').update(JSON.stringify(model)).digest('hex'), ts: new Date().toISOString() }
  await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2), 'utf8')
}

async function saveRegistry() {
  await fs.mkdir(MODEL_DIR, { recursive: true })
  await fs.writeFile(REGISTRY_FILE, JSON.stringify(Array.from(allowedPubkeys), null, 2), 'utf8')
}

async function persistSeen() {
  await fs.mkdir(MODEL_DIR, { recursive: true })
  await fs.writeFile(SEEN_FILE, JSON.stringify(Array.from(seen), null, 2), 'utf8')
}

function aggregateUpdates(updatesArr) {
  if (!updatesArr || updatesArr.length === 0) return null
  const len = updatesArr[0].length
  const out = new Array(len).fill(0)
  for (const u of updatesArr) {
    for (let i = 0; i < len; i++) out[i] += u[i]
  }
  return out.map((v) => v / updatesArr.length)
}

function verifySignature(pubkeyB64, sigB64, payloadStr) {
  try {
    const pub = Buffer.from(pubkeyB64, 'base64')
    const sig = Buffer.from(sigB64, 'base64')
    const msg = Buffer.from(payloadStr, 'utf8')
    return nacl.sign.detached.verify(new Uint8Array(msg), new Uint8Array(sig), new Uint8Array(pub))
  } catch (e) {
    return false
  }
}

async function run() {
  await loadModel()
  const app = express()
  app.use(bodyParser.json({ limit: '1mb' }))

  app.post('/updates', async (req, res) => {
    // Optional token auth
    if (AGG_TOKEN) {
      const auth = (req.headers.authorization || '').trim()
      if (!auth.startsWith('Bearer ') || auth.split(' ')[1] !== AGG_TOKEN) {
        return res.status(401).json({ error: 'unauthorized' })
      }
    }

    const { update, pubkey, sig, ts, nonce } = req.body || {}
    if (!Array.isArray(update)) return res.status(400).json({ error: 'update must be an array' })
    if (!pubkey || !sig || !ts) return res.status(400).json({ error: 'missing signature fields' })

    // If an on-chain registry object is configured, prefer it
    if (PUBKEY_REGISTRY_OBJ) {
      const onchain = await fetchOnchainRegistry()
      if (onchain && !onchain.has(pubkey)) return res.status(403).json({ error: 'pubkey not registered (on-chain)' })
    } else {
      // check allowed pubkeys (local file)
      if (allowedPubkeys.size > 0 && !allowedPubkeys.has(pubkey)) {
        return res.status(403).json({ error: 'pubkey not registered' })
      }
    }

    // TTL check
    const now = Date.now()
    if (Math.abs(now - Number(ts)) > TTL_MS) return res.status(400).json({ error: 'timestamp outside TTL' })

    // replay prevention: signature-based id (sig + pubkey + nonce)
    const seenId = crypto.createHash('sha256').update(`${pubkey}:${sig}:${nonce || ''}`).digest('hex')
    if (seen.has(seenId)) return res.status(409).json({ error: 'replay detected' })

    const payloadStr = JSON.stringify({ update, ts, nonce })
    const ok = verifySignature(pubkey, sig, payloadStr)
    updatesReceived.inc()
    if (!ok) return res.status(401).json({ error: 'invalid signature' })

    // mark seen
    seen.add(seenId)
    if (seen.size > SEEN_CACHE_LIMIT) {
      // trim oldest by converting to array and slicing (simple approach)
      const arr = Array.from(seen)
      const keep = arr.slice(-Math.floor(SEEN_CACHE_LIMIT / 2))
      seen = new Set(keep)
    }
    // persist seen asynchronously
    persistSeen().catch(() => {})

    updates.push(update)
    // perform aggregation when buffer full
    if (updates.length >= AGG_COUNT) {
      const agg = aggregateUpdates(updates)
      if (agg) {
        model = agg
        await saveModel()
        updates = []
        updatesAggregated.inc()
        lastAggregationTs.set(Date.now())
        return res.json({ ok: true, aggregated: true, modelSample: model.slice(0, 3) })
      }
    }
    return res.json({ ok: true, aggregated: false, buffer: updates.length })
  })

  // Registry management (protected)
  app.post('/register', async (req, res) => {
    if (!AGG_TOKEN) return res.status(403).json({ error: 'registration disabled' })
    const auth = (req.headers.authorization || '').trim()
    if (!auth.startsWith('Bearer ') || auth.split(' ')[1] !== AGG_TOKEN) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    const { pubkey } = req.body || {}
    if (!pubkey) return res.status(400).json({ error: 'pubkey required' })
    if (PUBKEY_REGISTRY_OBJ) return res.status(403).json({ error: 'registration disabled when on-chain registry configured' })
    allowedPubkeys.add(pubkey)
    await saveRegistry()
    return res.json({ ok: true, registered: pubkey })
  })

  app.get('/model', (req, res) => {
    res.json({ model })
  })

  app.get('/health', (req, res) => res.json({ status: 'ok', buffered: updates.length }))

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType)
    res.end(await register.metrics())
  })

  // By default aggregator listens on HTTP internally. Enable HTTPS only when
  // AGG_USE_TLS=1 is explicitly set (production edge case).
  const AGG_USE_TLS = process.env.AGG_USE_TLS === '1'
  const TLS_CERT = process.env.TLS_CERT || '/certs/server.crt.pem'
  const TLS_KEY = process.env.TLS_KEY || '/certs/server.key.pem'
  if (AGG_USE_TLS) {
    try {
      const cert = await fs.readFile(TLS_CERT)
      const key = await fs.readFile(TLS_KEY)
      const server = https.createServer({ cert, key }, app)
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`Aggregator listening on https://0.0.0.0:${PORT}`)
        console.log(`Model directory: ${MODEL_DIR}`)
      })
      return
    } catch (e) {
      console.warn('AGG_USE_TLS enabled but failed to load certs; falling back to HTTP', e?.message || e)
    }
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aggregator listening on http://0.0.0.0:${PORT}`)
    console.log(`Model directory: ${MODEL_DIR}`)
  })
}

run().catch((e) => {
  console.error('Aggregator failed to start:', e?.message || e)
  process.exit(1)
})
