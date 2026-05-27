const { SuiClient } = require('@mysten/sui/client')
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519')
const { Transaction } = require('@mysten/sui/transactions')

const rpc = process.env.SUI_RPC || 'http://sui-local:9000'
const faucetUrl = process.env.SUI_FAUCET_URL || 'http://sui-local:9123/v2/gas'

async function requestGas(address) {
  const res = await globalThis.fetch(faucetUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      FixedAmountRequest: { recipient: address },
    }),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`faucet request failed (${res.status}): ${text.slice(0, 300)}`)
  }

  return text
}

async function waitForBalance(client, address) {
  for (let i = 1; i <= 30; i += 1) {
    const bal = await client.getBalance({ owner: address })
    if (BigInt(bal.totalBalance) > 0n) {
      return bal.totalBalance
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error('timed out waiting for funded balance')
}

;(async function main() {
  try {
    console.log('Running first real transaction against', rpc)
    const client = new SuiClient({ url: rpc })
    const keypair = new Ed25519Keypair()
    const sender = keypair.toSuiAddress()

    console.log('Generated ephemeral sender:', sender)
    const faucetResult = await requestGas(sender)
    console.log('Faucet result:', faucetResult.slice(0, 200))

    const funded = await waitForBalance(client, sender)
    console.log('Funded balance:', funded)

    const tx = new Transaction()
    const [split] = tx.splitCoins(tx.gas, [tx.pure.u64(1000)])
    tx.transferObjects([split], sender)

    const exec = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { showEffects: true },
    })

    console.log('Transaction digest:', exec.digest)
    console.log('Execution status:', exec.effects?.status?.status || 'unknown')
  } catch (e) {
    console.error('Transaction script failed:', e.message)
    process.exit(2)
  }
})()
