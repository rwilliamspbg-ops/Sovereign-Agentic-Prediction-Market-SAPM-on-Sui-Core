import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockSignAndExecuteTransaction = jest.fn();

jest.mock('@mysten/wallet-standard', () => ({
  SUI_MAINNET_CHAIN: 'sui:mainnet',
  SUI_TESTNET_CHAIN: 'sui:testnet',
  signAndExecuteTransaction: mockSignAndExecuteTransaction,
}));

import { executeWithBlindSigningFallback } from '@/services/sui/wallet-standard';

describe('wallet-standard execution fallback', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('uses signTransaction + RPC execution when fallback is invoked', async () => {
    const signTransaction = jest.fn().mockResolvedValue({
      bytes: '0x1234',
      signatures: ['0xsig'],
    });
    const mockCreateClient = jest.fn().mockReturnValue({
      executeTransactionBlock: jest.fn().mockResolvedValue({ digest: '0xdeadbeef' }),
    });

    const context = {
      wallet: {
        features: {
          'sui:signTransaction': {
            signTransaction,
          },
        },
      },
      account: {
        address: '0x' + 'a'.repeat(64),
        chains: ['sui:testnet'],
      },
    };

    const result = await executeWithBlindSigningFallback(context as never, {} as never, 'testnet', {
      createClient: mockCreateClient,
    });

    expect(result?.digest).toBe('0xdeadbeef');
    expect(signTransaction).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });
});