#!/usr/bin/env node
const fs = require('node:fs')
const { buildTradePlan } = require('./forecast_to_trade')
const { dryRunTrade } = require('./ptb_builder')

function readInput(filePath) {
  if (filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  }
  return JSON.parse(fs.readFileSync(0, 'utf8'))
}

function main() {
  const args = process.argv.slice(2)
  const inputPath = args.find((arg) => !arg.startsWith('--'))
  const dryRun = args.includes('--dry-run')
  const rpcArgIndex = args.indexOf('--rpc')
  const packageArgIndex = args.indexOf('--package-id')
  const marketArgIndex = args.indexOf('--market-object-id')
  const quoteArgIndex = args.indexOf('--quote-coin-object-id')
  const senderArgIndex = args.indexOf('--sender')
  const options = {
    rpc: rpcArgIndex >= 0 ? args[rpcArgIndex + 1] : undefined,
    packageId: packageArgIndex >= 0 ? args[packageArgIndex + 1] : undefined,
    marketObjectId: marketArgIndex >= 0 ? args[marketArgIndex + 1] : undefined,
    quoteCoinObjectId: quoteArgIndex >= 0 ? args[quoteArgIndex + 1] : undefined,
    sender: senderArgIndex >= 0 ? args[senderArgIndex + 1] : undefined,
  }
  const meta = readInput(inputPath)
  if (dryRun) {
    dryRunTrade(meta, options)
      .then(({ plan, result, config }) => {
        process.stdout.write(`${JSON.stringify({ plan, config, dryRun: result?.effects || result }, null, 2)}\n`)
      })
      .catch((error) => {
        process.stderr.write(`${error.message || String(error)}\n`)
        process.exit(1)
      })
    return
  }

  const plan = buildTradePlan(meta)
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
}

if (require.main === module) {
  main()
}
