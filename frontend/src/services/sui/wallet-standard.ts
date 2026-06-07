import { getWallets } from '@wallet-standard/app';
import { SUI_MAINNET_CHAIN, SUI_TESTNET_CHAIN, signAndExecuteTransaction } from '@mysten/wallet-standard';
import type { Transaction } from '@mysten/sui/transactions';

const LAST_WALLET_ID_KEY = 'walletId';
const LAST_WALLET_ADDRESS_KEY = 'walletAddress';
const CONNECT_TIMEOUT_MS = 15000;

type WalletLike = ReturnType<ReturnType<typeof getWallets>['get']>[number];
type WalletAccount = WalletLike['accounts'][number];

function isValidSuiHexAddress(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Wallet ${label} timed out after ${timeoutMs}ms. Check extension popup and retry.`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function normalizeConnectError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes('json-rpc: method call timeout') || (lower.includes('timeout') && lower.includes('connect'))) {
    return new Error('Wallet connect timed out. Unlock/approve in your wallet extension and retry.');
  }

  if (lower.includes('reject') || lower.includes('denied') || lower.includes('cancel')) {
    return new Error('Wallet connection request was canceled. Please approve the request to continue.');
  }

  return error instanceof Error ? error : new Error(message);
}

export type WalletExecutionContext = {
  wallet: WalletLike;
  account: WalletAccount;
};

function hasConnectFeature(wallet: WalletLike): boolean {
  return typeof (wallet.features?.['standard:connect'] as { connect?: unknown } | undefined)?.connect === 'function';
}

function isSuiChain(chain: string): boolean {
  return chain === SUI_TESTNET_CHAIN || chain === SUI_MAINNET_CHAIN || chain.startsWith('sui:');
}

function hasSuiFeature(wallet: WalletLike): boolean {
  const featureKeys = Object.keys(wallet.features || {});
  return featureKeys.some((key) => key.startsWith('sui:'));
}

function hasSuiChain(wallet: WalletLike): boolean {
  if (Array.isArray(wallet.chains) && wallet.chains.some((chain) => isSuiChain(chain))) {
    return true;
  }

  if (Array.isArray(wallet.accounts)) {
    return wallet.accounts.some((account) => Array.isArray(account.chains)
      && account.chains.some((chain: string) => isSuiChain(chain)));
  }

  return false;
}

export function getCompatibleWallets(): WalletLike[] {
  return getWallets()
    .get()
    .filter((wallet) => hasConnectFeature(wallet) && (hasSuiChain(wallet) || hasSuiFeature(wallet)));
}

export async function getConnectedWalletContext(preferredWalletId?: string): Promise<WalletExecutionContext> {
  const walletCandidates = getWallets().get().filter((wallet) => hasConnectFeature(wallet) && (hasSuiChain(wallet) || hasSuiFeature(wallet)));
  if (walletCandidates.length === 0) {
    throw new Error('No compatible Sui wallet found. Install or enable a Sui wallet with testnet/mainnet support.');
  }

  const savedWalletId = localStorage.getItem(LAST_WALLET_ID_KEY);
  const savedAddress = localStorage.getItem(LAST_WALLET_ADDRESS_KEY);

  const wallet = walletCandidates.find((item) => (item.id || item.name) === preferredWalletId)
    || walletCandidates.find((item) => (item.id || item.name) === savedWalletId)
    || walletCandidates[0];

  const connectFeature = wallet.features['standard:connect'] as
    | { connect: (input?: { silent?: boolean }) => Promise<{ accounts: readonly WalletAccount[] }> }
    | undefined;

  if (!connectFeature) {
    throw new Error(`Wallet ${wallet.name} does not support connect.`);
  }

  const validWalletAccounts = wallet.accounts.filter((item) => {
    const accountHasSuiChain = Array.isArray(item.chains)
      ? item.chains.some((chain) => chain === SUI_TESTNET_CHAIN || chain === SUI_MAINNET_CHAIN)
      : true;
    return accountHasSuiChain && isValidSuiHexAddress(item.address);
  });
  let account = validWalletAccounts.find((item) => item.address === savedAddress) || validWalletAccounts[0];
  if (!account) {
    try {
      const output = await withTimeout(connectFeature.connect({ silent: false }), CONNECT_TIMEOUT_MS, 'connect');
      const connectedAddress = output.accounts?.[0]?.address;
      account = validWalletAccounts.find((item) => item.address === connectedAddress)
        || wallet.accounts.find((item) => item.address === connectedAddress && isValidSuiHexAddress(item.address))
        || validWalletAccounts[0];
    } catch (error) {
      throw normalizeConnectError(error);
    }
  }

  if (!account) {
    const accountList = wallet.accounts.map((item) => item.address).join(', ') || 'none';
    const featureList = Object.keys(wallet.features || {}).join(', ') || 'none';
    throw new Error(`Connected wallet does not expose a valid Sui account. Selected wallet: ${wallet.name}. Accounts: ${accountList}. Features: ${featureList}. Choose a Sui wallet account on testnet/mainnet.`);
  }

  localStorage.setItem(LAST_WALLET_ID_KEY, wallet.id || wallet.name);
  localStorage.setItem(LAST_WALLET_ADDRESS_KEY, account.address);

  return { wallet, account };
}

export async function signAndExecuteWalletTransaction(context: WalletExecutionContext, tx: Transaction, chain: 'testnet' | 'mainnet' = 'testnet') {
  const targetChain = chain === 'mainnet' ? SUI_MAINNET_CHAIN : SUI_TESTNET_CHAIN;
  let result: { digest?: string } | null = null;

  const modernFeature = context.wallet.features['sui:signAndExecuteTransaction'] as
    | { signAndExecuteTransaction?: (input: { account: WalletAccount; chain: string; transaction: Transaction }) => Promise<{ digest?: string }> }
    | undefined;

  if (typeof modernFeature?.signAndExecuteTransaction === 'function') {
    try {
      result = await modernFeature.signAndExecuteTransaction({
        account: context.account,
        chain: targetChain,
        transaction: tx,
      });
    } catch {
      result = null;
    }
  }

  if (!result) {
    try {
      result = await signAndExecuteTransaction(context.wallet, {
        account: context.account,
        chain: targetChain,
        transaction: tx,
      });
    } catch {
      result = null;
    }
  }

  if (!result) {
    const legacyFeature = context.wallet.features['sui:signAndExecuteTransactionBlock'] as
      | { signAndExecuteTransactionBlock?: (input: { account: WalletAccount; chain: string; transactionBlock: Transaction }) => Promise<{ digest?: string }> }
      | undefined;

    if (typeof legacyFeature?.signAndExecuteTransactionBlock === 'function') {
      result = await legacyFeature.signAndExecuteTransactionBlock({
        account: context.account,
        chain: targetChain,
        transactionBlock: tx,
      });
    }
  }

  if (!result?.digest) {
    const featureList = Object.keys(context.wallet.features || {}).join(', ');
    throw new Error(`Wallet execution failed. Ensure wallet supports sign-and-execute for Sui. Available features: ${featureList || 'none'}`);
  }

  return result;
}
