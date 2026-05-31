/**
 * SAPM Trading Adapter - Phase 3 Entry Point
 * Main entry point for forecast-to-trade conversion and execution
 */

const { ForecastToTradeAdapter } = require('./forecast_to_trade');
// test commit: trigger husky pre-commit hook (harmless comment)

// Example forecast metadata structure (from aggregator)
const exampleForecast = {
  confidence: 78.5,
  prediction: 0.785, // 78.5% probability of "yes" outcome
  eventQuery: 'SUI price above $2 by 2026-06-01T00:00:00Z',
  timestamp: Date.now(),
  agentPubkey: '0xplaceholder_agent_pubkey'
};

// Example market object ID
const exampleMarketObjectId = '0xplaceholder_market_object_id';

async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === 'true';
  const rpcEndpoint = args.find(a => a.startsWith('--rpc='))?.split('=')[1] || 
                     process.env.SUI_RPC || 'https://fullnode.testnet.sui.io:443';
  const packageId = args.find(a => a.startsWith('--package-id='))?.split('=')[1] ||
                    process.env.REGISTRY_PACKAGE_ID || '0xplaceholder_package_id';
  const marketObjectId = args.find(a => a.startsWith('--market-object-id='))?.split('=')[1] ||
                         exampleMarketObjectId;
  
  // Load forecast from file or stdin
  let forecastData;
  
  if (args.length > 0 && !args[0].startsWith('-')) {
    // Read from file
    const fs = require('fs');
    forecastData = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    console.log('[Trader] Loaded forecast from file');
  } else if (process.stdin.isTTY) {
    // Interactive mode - prompt for input
    console.log('[Trader] Please provide forecast data as JSON:');
    process.stdout.write('Enter forecast JSON: ');
    const input = await new Promise(resolve => process.stdin.once('data', resolve));
    forecastData = JSON.parse(input.toString());
  } else {
    // Default to example
    forecastData = exampleForecast;
    console.log('[Trader] Using example forecast data');
  }

  // Initialize adapter
  const adapter = new ForecastToTradeAdapter({ rpcEndpoint });
  
  if (!dryRun) {
    await adapter.initialize(rpcEndpoint, process.env.AGG_SUI_SECRET);
  }

  try {
    // Convert forecast to trade plan
    console.log('\n[Trader] Converting forecast to trade plan...');
    const tradePlan = await adapter.convertToTradePlan(forecastData, marketObjectId, packageId, { dryRun });
    
    // Output trade plan
    console.log('\n=== Trade Plan ===');
    console.log(JSON.stringify(tradePlan, null, 2));

    // Execute if not dry-run
    if (!dryRun && process.env.AGG_SUI_SECRET) {
      console.log('\n[Trader] Executing trade...');
      const result = await adapter.executeTradePlan(tradePlan, marketObjectId, packageId);
      
      console.log('\n=== Execution Result ===');
      console.log(JSON.stringify(result, null, 2));
    } else if (dryRun) {
      console.log('\n[Trader] Dry-run mode: PTB plan generated, no execution');
    }

    process.exit(0);
    
  } catch (error) {
    console.error('[Trader] Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { ForecastToTradeAdapter };
