import { getWallets } from '@wallet-standard/app';
import { SUI_MAINNET_CHAIN, SUI_TESTNET_CHAIN, signAndExecuteTransaction } from '@mysten/wallet-standard';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import type { Transaction } from '@mysten/sui/transactions';

const LAST_WALLET_ID_KEY = 'walletId';
const LAST_WALLET_ADDRESS_KEY = 'walletAddress';
const CONNECT_TIMEOUT_MS = 30000;
const SILENT_CONNECT_TIMEOUT_MS = 5000;
const SIGN_TIMEOUT_MS = 60000;

function isBlindSigningFallbackEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_ENABLE_BLIND_SIGNING_FALLBACK;
  return typeof raw === 'string' && raw.trim().toLowerCase() === 'true';
}

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

type BlindSigningFallbackDependencies = {
  createClient?: (url: string) => {
    executeTransactionBlock: (input: {
      transactionBlock: string;
      signature: string | string[];
      options: { showEffects: boolean };
    }) => Promise<{ digest?: string }>;
  };
};

export async function executeWithBlindSigningFallback(
  context: WalletExecutionContext,
  tx: Transaction,
  chain: 'testnet' | 'mainnet' = 'testnet',
  dependencies: BlindSigningFallbackDependencies = {},
): Promise<{ digest?: string } | null> {
  const signFeature = context.wallet.features['sui:signTransaction'] as
    | {
        signTransaction?: (input: { account: WalletAccount; chain: string; transaction: Transaction }) => Promise<{
          bytes?: string;
          transactionBlockBytes?: string;
          signature?: string;
          signatures?: string[];
        }>;
      }
    | undefined;

  if (typeof signFeature?.signTransaction !== 'function') {
    return null;
  }

  const signed = await withTimeout(
    signFeature.signTransaction({
      account: context.account,
      chain: chain === 'mainnet' ? SUI_MAINNET_CHAIN : SUI_TESTNET_CHAIN,
      transaction: tx,
    }),
    SIGN_TIMEOUT_MS,
    'signTransaction'
  );

  const transactionBytes = signed.bytes || signed.transactionBlockBytes;
  const signatures = signed.signatures || (signed.signature ? [signed.signature] : []);

  if (!transactionBytes || signatures.length === 0) {
    throw new Error('Wallet signTransaction did not return transaction bytes/signature.');
  }

  const client = dependencies.createClient
    ? dependencies.createClient(getFullnodeUrl(chain))
    : new SuiClient({ url: getFullnodeUrl(chain) });
  const execution = await withTimeout(
    client.executeTransactionBlock({
      transactionBlock: transactionBytes,
      signature: signatures.length === 1 ? signatures[0] : signatures,
      options: { showEffects: true },
    }),
    SIGN_TIMEOUT_MS,
    'executeTransactionBlock'
  );

  return { digest: execution.digest };
}

function hasConnectFeature(wallet: WalletLike): boolean {
  return typeof (wallet.features?.['standard:connect'] as { connect?: unknown } | undefined)?.connect === 'function';
}

function isNightlyWallet(wallet: WalletLike): boolean {
  const id = String(wallet.id || '').toLowerCase();
  const name = String(wallet.name || '').toLowerCase();
  return id.includes('nightly') || name.includes('nightly');
}

function pickPreferredWallet(wallets: WalletLike[], preferredWalletId?: string | null, savedWalletId?: string | null): WalletLike {
  const preferred = (preferredWalletId || '').trim();
  if (preferred) {
    const matched = wallets.find((item) => (item.id || item.name) === preferred);
    if (matched) {
      return matched;
    }
  }

  const nightly = wallets.find((item) => isNightlyWallet(item));
  if (nightly) {
    return nightly;
  }

  const saved = (savedWalletId || '').trim();
  if (saved) {
    const matched = wallets.find((item) => (item.id || item.name) === saved);
    if (matched) {
      return matched;
    }
  }

  return wallets[0];
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

function isLikelySuiWallet(wallet: WalletLike): boolean {
  return hasSuiChain(wallet) || hasSuiFeature(wallet);
}

export function getCompatibleWallets(): WalletLike[] {
  return getWallets()
    .get()
    .filter((wallet) => hasConnectFeature(wallet) && isLikelySuiWallet(wallet));
}

export async function getConnectedWalletContext(preferredWalletId?: string): Promise<WalletExecutionContext> {
  const walletCandidates = getWallets().get().filter((wallet) => hasConnectFeature(wallet) && isLikelySuiWallet(wallet));
  if (walletCandidates.length === 0) {
    throw new Error('No compatible Sui wallet found. Install or enable a Sui wallet with testnet/mainnet support.');
  }

  const savedWalletId = localStorage.getItem(LAST_WALLET_ID_KEY);
  const savedAddress = localStorage.getItem(LAST_WALLET_ADDRESS_KEY);

  const wallet = pickPreferredWallet(walletCandidates, preferredWalletId, savedWalletId);

  const connectFeature = wallet.features['standard:connect'] as
    | { connect: (input?: { silent?: boolean }) => Promise<{ accounts: readonly WalletAccount[] }> }
    | undefined;

  if (!connectFeature) {
    throw new Error(`Wallet ${wallet.name} does not support connect.`);
  }

  let validWalletAccounts = wallet.accounts.filter((item) => {
    const accountHasSuiChain = Array.isArray(item.chains)
      ? item.chains.some((chain) => chain === SUI_TESTNET_CHAIN || chain === SUI_MAINNET_CHAIN || chain.startsWith('sui:'))
      : true;
    return accountHasSuiChain && isValidSuiHexAddress(item.address);
  });

  let account = validWalletAccounts.find((item) => item.address === savedAddress) || validWalletAccounts[0];
  if (!account) {
    try {
      // Always perform at least a silent connect handshake before signing.
      // Some wallets (including Nightly on some builds) need this to surface approval correctly.
      let output;
      try {
        output = await withTimeout(connectFeature.connect({ silent: true }), SILENT_CONNECT_TIMEOUT_MS, 'silent connect');
      } catch {
        output = await withTimeout(connectFeature.connect({ silent: false }), CONNECT_TIMEOUT_MS, 'connect');
      }

      validWalletAccounts = wallet.accounts.filter((item) => {
        const accountHasSuiChain = Array.isArray(item.chains)
          ? item.chains.some((chain) => chain === SUI_TESTNET_CHAIN || chain === SUI_MAINNET_CHAIN || chain.startsWith('sui:'))
          : true;
        return accountHasSuiChain && isValidSuiHexAddress(item.address);
      });

      const connectedAddress = output.accounts?.[0]?.address;
      account = validWalletAccounts.find((item) => item.address === connectedAddress)
        || wallet.accounts.find((item) => item.address === connectedAddress && isValidSuiHexAddress(item.address))
        || validWalletAccounts.find((item) => item.address === savedAddress)
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
  let lastExecutionError: unknown = null;
  const hasExecuteFeature = typeof (context.wallet.features['sui:signAndExecuteTransaction'] as { signAndExecuteTransaction?: unknown } | undefined)?.signAndExecuteTransaction === 'function'
    || typeof (context.wallet.features['sui:signAndExecuteTransactionBlock'] as { signAndExecuteTransactionBlock?: unknown } | undefined)?.signAndExecuteTransactionBlock === 'function';

  if (Array.isArray(context.account.chains) && context.account.chains.length > 0) {
    const supportsTargetChain = context.account.chains.includes(targetChain)
      || context.account.chains.some((value) => value.startsWith('sui:'));
    if (!supportsTargetChain) {
      throw new Error(`Connected wallet account is on ${context.account.chains.join(', ')}. Switch wallet network/account to ${chain} and retry.`);
    }
  }

  const modernFeature = context.wallet.features['sui:signAndExecuteTransaction'] as
    | { signAndExecuteTransaction?: (input: { account: WalletAccount; chain: string; transaction: Transaction }) => Promise<{ digest?: string }> }
    | undefined;

  if (typeof modernFeature?.signAndExecuteTransaction === 'function') {
    try {
      result = await withTimeout(
        modernFeature.signAndExecuteTransaction({
          account: context.account,
          chain: targetChain,
          transaction: tx,
        }),
        SIGN_TIMEOUT_MS,
        'signAndExecuteTransaction'
      );
    } catch (error) {
      lastExecutionError = error;
      result = null;
    }
  }

  if (!result) {
    try {
      result = await withTimeout(
        signAndExecuteTransaction(context.wallet, {
          account: context.account,
          chain: targetChain,
          transaction: tx,
        }),
        SIGN_TIMEOUT_MS,
        'wallet-standard signAndExecuteTransaction'
      );
    } catch (error) {
      lastExecutionError = error;
      result = null;
    }
  }

  if (!result) {
    const legacyFeature = context.wallet.features['sui:signAndExecuteTransactionBlock'] as
      | { signAndExecuteTransactionBlock?: (input: { account: WalletAccount; chain: string; transactionBlock: Transaction }) => Promise<{ digest?: string }> }
      | undefined;

    if (typeof legacyFeature?.signAndExecuteTransactionBlock === 'function') {
      try {
        result = await withTimeout(
          legacyFeature.signAndExecuteTransactionBlock({
            account: context.account,
            chain: targetChain,
            transactionBlock: tx,
          }),
          SIGN_TIMEOUT_MS,
          'signAndExecuteTransactionBlock'
        );
      } catch (error) {
        lastExecutionError = error;
        result = null;
      }
    }
  }

  if (!result) {
    const signFeature = context.wallet.features['sui:signTransaction'] as
      | { signTransaction?: unknown }
      | undefined;

    if (!hasExecuteFeature && isBlindSigningFallbackEnabled() && typeof signFeature?.signTransaction === 'function') {
      try {
        result = await executeWithBlindSigningFallback(context, tx, chain);
      } catch (error) {
        lastExecutionError = error;
        result = null;
      }
    }
  }

  if (!result?.digest) {
    const featureList = Object.keys(context.wallet.features || {}).join(', ');
    const detail = lastExecutionError instanceof Error ? ` Last error: ${lastExecutionError.message}` : '';
    throw new Error(`Wallet execution failed. Unlock/foreground your wallet extension and approve the request. Ensure wallet supports sui:signAndExecuteTransaction (or legacy sui:signAndExecuteTransactionBlock). If wallet only supports signTransaction, enable wallet blind signing and set NEXT_PUBLIC_ENABLE_BLIND_SIGNING_FALLBACK=true. Available features: ${featureList || 'none'}.${detail}`);
  }

  return result;
}
