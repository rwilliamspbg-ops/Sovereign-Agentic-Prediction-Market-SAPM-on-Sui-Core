import { getWallets } from '@wallet-standard/app';
import { SUI_MAINNET_CHAIN, SUI_TESTNET_CHAIN, signAndExecuteTransaction } from '@mysten/wallet-standard';
import type { Transaction } from '@mysten/sui/transactions';

const LAST_WALLET_ID_KEY = 'walletId';
const LAST_WALLET_ADDRESS_KEY = 'walletAddress';

type WalletLike = ReturnType<ReturnType<typeof getWallets>['get']>[number];
type WalletAccount = WalletLike['accounts'][number];

function isValidSuiHexAddress(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

export type WalletExecutionContext = {
  wallet: WalletLike;
  account: WalletAccount;
};

function hasConnectFeature(wallet: WalletLike): boolean {
  return typeof (wallet.features?.['standard:connect'] as { connect?: unknown } | undefined)?.connect === 'function';
}

function hasSignAndExecuteFeature(wallet: WalletLike): boolean {
  const modern = typeof (wallet.features?.['sui:signAndExecuteTransaction'] as { signAndExecuteTransaction?: unknown } | undefined)?.signAndExecuteTransaction === 'function';
  const legacy = typeof (wallet.features?.['sui:signAndExecuteTransactionBlock'] as { signAndExecuteTransactionBlock?: unknown } | undefined)?.signAndExecuteTransactionBlock === 'function';
  return modern || legacy;
}

export function getCompatibleWallets(): WalletLike[] {
  return getWallets()
    .get()
    .filter((wallet) => hasConnectFeature(wallet));
}

export async function getConnectedWalletContext(preferredWalletId?: string): Promise<WalletExecutionContext> {
  const walletCandidates = getWallets().get().filter((wallet) => hasConnectFeature(wallet));
  if (walletCandidates.length === 0) {
    throw new Error('No wallet found that supports connect. Install or enable a wallet extension first.');
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
    const output = await connectFeature.connect({ silent: false });
    const connectedAddress = output.accounts?.[0]?.address;
    account = validWalletAccounts.find((item) => item.address === connectedAddress)
      || wallet.accounts.find((item) => item.address === connectedAddress && isValidSuiHexAddress(item.address))
      || validWalletAccounts[0];
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
