const { Transaction } = require('@mysten/sui/transactions')
const { SuiClient } = require('@mysten/sui/client')
const { buildTradePlan } = require('./forecast_to_trade')

function normalizeConfig(options = {}) {
  const packageId = options.packageId || process.env.PHASE3_PACKAGE_ID || null
  const moduleName = options.moduleName || process.env.PHASE3_MODULE_NAME || 'market'
  const functionName = options.functionName || process.env.PHASE3_FUNCTION_NAME || 'trade'
  const marketObjectId = options.marketObjectId || process.env.PHASE3_MARKET_OBJECT_ID || null
  const quoteCoinObjectId = options.quoteCoinObjectId || process.env.PHASE3_QUOTE_COIN_OBJECT_ID || null
  const minStake = Number(options.minStake ?? process.env.PHASE3_MIN_STAKE ?? 1)
  return {
    packageId,
    moduleName,
    functionName,
    marketObjectId,
    quoteCoinObjectId,
    minStake,
  }
}

function assertTradeConfig(config) {
  if (!config.packageId) throw new Error('missing packageId for PTB trade execution')
  if (!config.marketObjectId) throw new Error('missing marketObjectId for PTB trade execution')
  if (!config.quoteCoinObjectId) throw new Error('missing quoteCoinObjectId for PTB trade execution')
}

function buildTradeTransaction(meta, options = {}) {
  const config = normalizeConfig(options)
  assertTradeConfig(config)
  const plan = buildTradePlan(meta, options)
  const tx = new Transaction()
  const sender = options.sender || process.env.PHASE3_SENDER || undefined
  if (sender) {
    tx.setSenderIfNotSet(sender)
  }
  tx.setGasBudgetIfNotSet(Number(options.gasBudget ?? process.env.PHASE3_GAS_BUDGET ?? 100000000))

  const amount = plan.stake < config.minStake ? config.minStake : plan.stake
  const amountArg = tx.pure.u64(BigInt(Math.trunc(amount * 1_000_000_000)))
  const marketArg = tx.object(config.marketObjectId)
  const quoteArg = tx.object(config.quoteCoinObjectId)

  tx.moveCall({
    target: `${config.packageId}::${config.moduleName}::${config.functionName}`,
    arguments: [marketArg, quoteArg, amountArg, tx.pure.string(plan.decision), tx.pure.string(plan.marketId)],
  })

  return { tx, plan, config }
}

async function dryRunTrade(meta, options = {}) {
  const rpc = options.rpc || process.env.SUI_RPC || null
  if (!rpc) throw new Error('missing rpc for dry-run')
  const client = options.client || new SuiClient({ url: rpc })
  const { tx, plan, config } = buildTradeTransaction(meta, options)
  const result = await client.dryRunTransactionBlock({ transactionBlock: tx })
  return { plan, config, result }
}

module.exports = {
  buildTradeTransaction,
  dryRunTrade,
  normalizeConfig,
  assertTradeConfig,
}
