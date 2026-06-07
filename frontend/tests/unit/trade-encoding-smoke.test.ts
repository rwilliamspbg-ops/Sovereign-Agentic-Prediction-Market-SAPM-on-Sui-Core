import { describe, expect, test } from '@jest/globals';
import {
  buildTradeArgumentPreview,
  getTradePreflightIssues,
  parseTarget,
  type TradeRequest,
} from '@/components/TradeExecution';

describe('trade encoding smoke checks', () => {
  const baseTrade: TradeRequest = {
    marketId: '0xabc123',
    side: 'yes',
    amount: 1.25,
    executionPrice: 0.42,
    timestamp: new Date('2026-01-01T00:00:00Z'),
  };

  test('registry argument mapping returns object + vector payload', () => {
    const mapped = buildTradeArgumentPreview({
      parsedTarget: parseTarget('0x1::registry::add_key'),
      paramsWithoutCtx: [
        { MutableReference: { Struct: { address: '0x1', module: 'registry', name: 'PubkeyRegistry' } } },
        { Vector: 'U8' },
      ],
      trade: baseTrade,
      walletAddress: '0x' + 'a'.repeat(64),
      registryObjectId: '0x' + 'b'.repeat(64),
    });

    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toEqual({ kind: 'object', value: '0x' + 'b'.repeat(64) });
    expect(mapped[1].kind).toBe('vector_u8');
    expect(typeof mapped[1].value).toBe('number');
    expect((mapped[1].value as number) > 0).toBe(true);
  });

  test('deepbook argument mapping orders u64 fields and side bool', () => {
    const paramsWithoutCtx: unknown[] = [
      { MutableReference: { Struct: { address: '0xdee', module: 'pool', name: 'Pool' } } },
      { MutableReference: { Struct: { address: '0xdee', module: 'balance_manager', name: 'BalanceManager' } } },
      'U64',
      'U64',
      'U64',
      'Bool',
      { Reference: { Struct: { address: '0x2', module: 'clock', name: 'Clock' } } },
    ];

    const mapped = buildTradeArgumentPreview({
      parsedTarget: parseTarget('0xdee::pool::place_limit_order'),
      paramsWithoutCtx,
      trade: baseTrade,
      walletAddress: '0x' + 'a'.repeat(64),
      deepbookPoolObjectId: '0x' + '1'.repeat(64),
      deepbookBalanceManagerObjectId: '0x' + '2'.repeat(64),
      suiClockObjectId: '0x6',
      clientOrderId: 777,
    });

    expect(mapped.map((item) => item.kind)).toEqual([
      'object', 'object', 'u64', 'u64', 'u64', 'bool', 'object',
    ]);
    expect(mapped[2]).toEqual({ kind: 'u64', value: 777 });
    expect(mapped[5]).toEqual({ kind: 'bool', value: true });
    expect(mapped[6]).toEqual({ kind: 'object', value: '0x6' });
  });

  test('default preflight checks return actionable issues for invalid market id', () => {
    const issues = getTradePreflightIssues('market_without_hex_prefix');
    expect(Array.isArray(issues)).toBe(true);
    expect(issues.length).toBeGreaterThan(0);
  });
});
