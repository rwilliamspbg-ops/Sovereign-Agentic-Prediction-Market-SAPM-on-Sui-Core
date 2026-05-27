const test = require('node:test')
const assert = require('node:assert/strict')
const { discoverMarket } = require('../market_discovery')

test('discoverMarket queries the configured object id', async () => {
  const fakeClient = {
    getObject: async ({ id }) => ({
      data: {
        objectId: id,
        owner: { AddressOwner: '0xabc' },
        type: '0x123::market::Market',
        version: '7',
      },
    }),
  }

  const market = await discoverMarket({
    rpc: 'http://127.0.0.1:9000',
    marketObjectId: '0xdeadbeef',
    marketId: 'sui-above-x',
    client: fakeClient,
  })

  assert.equal(market.discovered, true)
  assert.equal(market.objectId, '0xdeadbeef')
  assert.equal(market.owner.AddressOwner, '0xabc')
  assert.equal(market.type, '0x123::market::Market')
})
