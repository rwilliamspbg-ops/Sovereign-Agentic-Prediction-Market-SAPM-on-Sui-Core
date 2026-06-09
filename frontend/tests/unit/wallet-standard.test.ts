import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockSignAndExecuteTransaction = jest.fn();

jest.mock('@mysten/wallet-standard', () => ({
  SUI_MAINNET_CHAIN: 'sui:mainnet',
  SUI_TESTNET_CHAIN: 'sui:testnet',
  signAndExecuteTransaction: mockSignAndExecuteTransaction,
}));

import { executeWithBlindSigningFallback, signAndExecuteWalletTransaction } from '@/services/sui/wallet-standard';

describe('wallet-standard execution fallback', () => {
  const originalBlindSigningEnv = process.env.NEXT_PUBLIC_ENABLE_BLIND_SIGNING_FALLBACK;

  beforeEach(() => {
    jest.resetAllMocks();
    if (typeof originalBlindSigningEnv === 'undefined') {
      delete process.env.NEXT_PUBLIC_ENABLE_BLIND_SIGNING_FALLBACK;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_BLIND_SIGNING_FALLBACK = originalBlindSigningEnv;
    }
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

  test('does not use signTransaction fallback when blind-signing env flag is disabled', async () => {
    delete process.env.NEXT_PUBLIC_ENABLE_BLIND_SIGNING_FALLBACK;

    const signTransaction = jest.fn().mockResolvedValue({
      bytes: '0x1234',
      signatures: ['0xsig'],
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

    await expect(signAndExecuteWalletTransaction(context as never, {} as never, 'testnet')).rejects.toThrow(
      'Wallet execution failed. Unlock/foreground your wallet extension and approve the request.',
    );
    expect(signTransaction).toHaveBeenCalledTimes(0);
  });

  test('uses signTransaction fallback when blind-signing env flag is enabled', async () => {
    process.env.NEXT_PUBLIC_ENABLE_BLIND_SIGNING_FALLBACK = 'true';

    const signTransaction = jest.fn().mockResolvedValue({
      bytes: '0x1234',
      signatures: ['0xsig'],
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

    await expect(signAndExecuteWalletTransaction(context as never, {} as never, 'testnet')).rejects.toThrow(
      'Wallet execution failed. Unlock/foreground your wallet extension and approve the request.',
    );
    expect(signTransaction).toHaveBeenCalledTimes(1);
  });
});
