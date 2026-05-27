const crypto = require('crypto')

async function computeLocalUpdate(model) {
  // Simple placeholder: produce a small random delta for each weight
  if (!Array.isArray(model)) model = Array.from({ length: 10 }, () => 0)
  const update = model.map((v) => v + (Math.random() - 0.5) * 0.02)
  return update
}

async function aggregateUpdates(updates) {
  // Average all updates elementwise
  if (!updates || updates.length === 0) return null
  const len = updates[0].length
  const out = new Array(len).fill(0)
  for (const u of updates) {
    for (let i = 0; i < len; i++) out[i] += u[i]
  }
  return out.map((v) => v / updates.length)
}

async function sendUpdate(aggregatorUrl, payload) {
  if (!aggregatorUrl) return null
  try {
    const headers = { 'content-type': 'application/json' }
    if (process.env.AGG_TOKEN) headers.Authorization = `Bearer ${process.env.AGG_TOKEN}`
    const res = await fetch(`${aggregatorUrl.replace(/\/$/, '')}/updates`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch (e) {
    console.error('Failed to send update to aggregator:', e.message || e)
    return false
  }
}

function modelHash(model) {
  return crypto.createHash('sha256').update(JSON.stringify(model)).digest('hex')
}

module.exports = { computeLocalUpdate, aggregateUpdates, sendUpdate, modelHash }
