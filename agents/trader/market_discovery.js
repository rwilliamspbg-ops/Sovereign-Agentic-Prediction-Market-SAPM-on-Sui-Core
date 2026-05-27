const { SuiClient } = require('@mysten/sui/client')

function normalizeMarketConfig(options = {}) {
  return {
    rpc: options.rpc || process.env.SUI_RPC || null,
    marketObjectId: options.marketObjectId || process.env.PHASE3_MARKET_OBJECT_ID || null,
    marketId: options.marketId || null,
    impliedProbability: Number(options.impliedProbability ?? process.env.PHASE3_IMPLIED_PROBABILITY ?? 0.5),
  }
}

function assertDiscoveryConfig(config) {
  if (!config.rpc) throw new Error('missing rpc for market discovery')
  if (!config.marketObjectId) throw new Error('missing marketObjectId for market discovery')
}

async function discoverMarket(options = {}) {
  const config = normalizeMarketConfig(options)
  assertDiscoveryConfig(config)
  const client = options.client || new SuiClient({ url: config.rpc })
  const object = await client.getObject({
    id: config.marketObjectId,
    options: { showOwner: true, showType: true, showContent: true, showDisplay: true },
  })
  return {
    ...config,
    discovered: true,
    object,
    objectId: config.marketObjectId,
    marketId: config.marketId || config.marketObjectId,
    owner: object?.data?.owner || null,
    type: object?.data?.type || null,
    version: object?.data?.version || null,
    status: object?.error ? 'unavailable' : 'available',
  }
}

module.exports = {
  normalizeMarketConfig,
  assertDiscoveryConfig,
  discoverMarket,
}
