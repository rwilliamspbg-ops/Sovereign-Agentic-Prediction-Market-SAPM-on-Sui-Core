function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeConfidence(meta) {
  const confidence = Number(meta?.confidence ?? meta?.aggregator?.confidence ?? 0)
  if (Number.isNaN(confidence)) return 0
  return clamp(confidence, 0, 1)
}

function normalizeImpliedProbability(meta) {
  const impliedProbability = Number(meta?.impliedProbability ?? meta?.market?.impliedProbability ?? 0.5)
  if (Number.isNaN(impliedProbability)) return 0.5
  return clamp(impliedProbability, 0, 1)
}

function buildTradePlan(meta, options = {}) {
  const confidenceThreshold = Number(options.confidenceThreshold ?? process.env.PHASE3_CONFIDENCE_THRESHOLD ?? 0.7)
  const edgeThreshold = Number(options.edgeThreshold ?? process.env.PHASE3_EDGE_THRESHOLD ?? 0.05)
  const maxStake = Number(options.maxStake ?? process.env.PHASE3_MAX_STAKE ?? 1)
  const confidence = normalizeConfidence(meta)
  const impliedProbability = normalizeImpliedProbability(meta)
  const edge = confidence - impliedProbability

  let decision = 'hold'
  if (confidence >= confidenceThreshold && edge >= edgeThreshold) {
    decision = 'buy_yes'
  } else if (confidence <= (1 - confidenceThreshold) && edge <= -edgeThreshold) {
    decision = 'buy_no'
  }

  return {
    marketId: meta?.marketId || meta?.round || 'unknown',
    decision,
    confidence,
    impliedProbability,
    edge,
    stake: decision === 'hold' ? 0 : maxStake,
    rationale: {
      confidenceThreshold,
      edgeThreshold,
      maxStake,
      sourceRound: meta?.round || null,
    },
  }
}

module.exports = { buildTradePlan }
