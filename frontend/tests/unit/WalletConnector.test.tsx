import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { WalletConnector } from '@/components/trading/WalletConnector';

jest.mock('@wallet-standard/app', () => ({
  getWallets: () => ({
    get: () => [],
    on: () => () => {},
  }),
}));

jest.mock('@mysten/wallet-standard', () => ({
  SUI_TESTNET_CHAIN: 'sui:testnet',
  SUI_MAINNET_CHAIN: 'sui:mainnet',
  isWalletWithRequiredFeatureSet: () => false,
}));

jest.mock('@mysten/sui/client', () => ({
  SuiClient: jest.fn().mockImplementation(() => ({
    getBalance: jest.fn(),
  })),
  getFullnodeUrl: (net: string) => `https://fullnode.${net}.sui.io`,
}));

describe('WalletConnector Component', () => {
  it('renders connect button and accessible tooltip with group-focus-within class when disconnected', () => {
    render(<WalletConnector />);

    const button = screen.getByRole('button', { name: /Connect Wallet/ });
    expect(button).toBeTruthy();

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toBe('Install a Sui wallet extension');
    expect(tooltip.className).toContain('group-focus-within:opacity-100');
    expect(tooltip.className).toContain('group-hover:opacity-100');
  });
});
