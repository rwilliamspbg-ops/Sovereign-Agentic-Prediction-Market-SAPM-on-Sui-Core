import { describe, expect, test } from '@jest/globals';
import { DeepBookService } from '@/services/sui/deepbook-service';

describe('deepbook lifecycle builders', () => {
  const service = new DeepBookService('testnet');

  test('buildPlaceLimitOrderTransaction maps target and argument arity', () => {
    const tx = service.buildPlaceLimitOrderTransaction({
      poolObjectId: '0x' + '1'.repeat(64),
      balanceManagerObjectId: '0x' + '2'.repeat(64),
      clientOrderId: 111,
      priceMist: 222,
      quantityMist: 333,
      isBid: true,
      clockObjectId: '0x6',
    });

    const data = tx.getData();
    expect(data.commands).toHaveLength(1);

    const moveCall = (data.commands[0] as { MoveCall?: { module?: string; function?: string; arguments?: unknown[] } }).MoveCall;
    expect(moveCall?.module).toBe('pool');
    expect(moveCall?.function).toBe('place_limit_order');
    expect(moveCall?.arguments?.length).toBe(7);
  });

  test('buildCancelOrderTransaction maps cancel target and args', () => {
    const tx = service.buildCancelOrderTransaction({
      poolObjectId: '0x' + '1'.repeat(64),
      balanceManagerObjectId: '0x' + '2'.repeat(64),
      clientOrderId: 444,
      clockObjectId: '0x6',
    });

    const data = tx.getData();
    expect(data.commands).toHaveLength(1);

    const moveCall = (data.commands[0] as { MoveCall?: { module?: string; function?: string; arguments?: unknown[] } }).MoveCall;
    expect(moveCall?.module).toBe('pool');
    expect(moveCall?.function).toBe('cancel_order');
    expect(moveCall?.arguments?.length).toBe(4);
  });

  test('buildReplaceOrderTransaction composes cancel then place', () => {
    const tx = service.buildReplaceOrderTransaction(
      {
        poolObjectId: '0x' + '1'.repeat(64),
        balanceManagerObjectId: '0x' + '2'.repeat(64),
        clientOrderId: 555,
        clockObjectId: '0x6',
      },
      {
        poolObjectId: '0x' + '1'.repeat(64),
        balanceManagerObjectId: '0x' + '2'.repeat(64),
        clientOrderId: 556,
        priceMist: 888,
        quantityMist: 999,
        isBid: false,
        clockObjectId: '0x6',
      },
    );

    const data = tx.getData();
    expect(data.commands).toHaveLength(2);

    const first = (data.commands[0] as { MoveCall?: { function?: string } }).MoveCall;
    const second = (data.commands[1] as { MoveCall?: { function?: string } }).MoveCall;

    expect(first?.function).toBe('cancel_order');
    expect(second?.function).toBe('place_limit_order');
  });
});
