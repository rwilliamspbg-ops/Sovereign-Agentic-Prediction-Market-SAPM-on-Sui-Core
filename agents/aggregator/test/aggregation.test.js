const test = require('node:test')
const assert = require('node:assert/strict')

const {
  trimmedMean,
  simpleMultiKrum,
  aggregateUpdates,
} = require('../server')

test('trimmed mean suppresses single extreme outlier', () => {
  const updates = [
    [0.10, 0.20, 0.30],
    [0.11, 0.21, 0.29],
    [0.09, 0.19, 0.31],
    [50, 50, 50],
    [0.10, 0.20, 0.30],
  ]
  const out = trimmedMean(updates, 0.2)
  assert.equal(out.length, 3)
  assert.ok(out[0] < 1)
  assert.ok(out[1] < 1)
  assert.ok(out[2] < 1)
})

test('simple multi-krum selects cluster near honest updates', () => {
  const updates = [
    [0.50, 0.52, 0.49],
    [0.51, 0.53, 0.50],
    [0.49, 0.51, 0.48],
    [0.50, 0.52, 0.51],
    [100, -100, 75],
  ]
  const out = simpleMultiKrum(updates, 1)
  assert.equal(out.length, 3)
  assert.ok(Math.abs(out[0] - 0.5) < 0.1)
  assert.ok(Math.abs(out[1] - 0.52) < 0.1)
  assert.ok(Math.abs(out[2] - 0.5) < 0.1)
})

test('aggregateUpdates respects AGG_STRATEGY=trimmed', () => {
  const prev = process.env.AGG_STRATEGY
  process.env.AGG_STRATEGY = 'trimmed'
  try {
    const updates = [
      [0, 0],
      [0.1, 0.1],
      [0.2, 0.2],
      [100, 100],
      [0.3, 0.3],
    ]
    const out = aggregateUpdates(updates)
    assert.equal(out.length, 2)
    assert.ok(out[0] < 1)
    assert.ok(out[1] < 1)
  } finally {
    if (typeof prev === 'undefined') delete process.env.AGG_STRATEGY
    else process.env.AGG_STRATEGY = prev
  }
})
