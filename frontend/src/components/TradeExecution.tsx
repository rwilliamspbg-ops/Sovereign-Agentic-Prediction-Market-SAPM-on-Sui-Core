'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { getConnectedWalletContext, signAndExecuteWalletTransaction } from '@/services/sui/wallet-standard';
import { SUI_PACKAGE_ID } from '@/lib/sui-config';
import { emitObservabilityEvent } from '@/lib/observability';

export interface TradeRequest {
  marketId: string;
  side: 'yes' | 'no';
  amount: number;
  executionPrice: number;
  timestamp: Date;
}

interface TradeResult {
  id: string;
  status: 'pending' | 'success' | 'error';
  stage: 'approval' | 'submitted' | 'confirmed' | 'failed';
  marketId: string;
  side: 'yes' | 'no';
  amount: number;
  executionPrice: number;
  totalCost: number;
  position: number;
  transactionHash?: string;
  timestamp: Date;
  error?: string;
}

interface TradeHistory {
  [marketId: string]: TradeResult[];
}

const SUI_MIST = 1_000_000_000;
const TRADE_RETRY_ATTEMPTS = 2;
const BASE_RETRY_DELAY_MS = 500;
const MAX_NOTIONAL_SUI = 100_000;
const CONFIGURED_TRADE_TARGET = process.env.NEXT_PUBLIC_SUI_TRADE_TARGET || `${SUI_PACKAGE_ID}::registry::add_key`;
const CONFIGURED_REGISTRY_OBJECT_ID = process.env.NEXT_PUBLIC_SUI_REGISTRY_OBJECT_ID || '';
const CONFIGURED_DEEPBOOK_POOL_OBJECT_ID = process.env.NEXT_PUBLIC_DEEPBOOK_POOL_OBJECT_ID || '';
const CONFIGURED_DEEPBOOK_BALANCE_MANAGER_OBJECT_ID = process.env.NEXT_PUBLIC_DEEPBOOK_BALANCE_MANAGER_OBJECT_ID || '';
const CONFIGURED_SUI_CLOCK_OBJECT_ID = process.env.NEXT_PUBLIC_SUI_CLOCK_OBJECT_ID || '0x6';

export type ParsedTarget = {
  packageId: string;
  moduleName: string;
  functionName: string;
};

type TargetIntrospectionState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  target: string;
  network: 'testnet' | 'mainnet';
  visibility?: string;
  isEntry?: boolean;
  parameterTypes?: string[];
  returnTypes?: string[];
  message?: string;
};

function isValidSuiHexAddress(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  return /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

export function resolveTradeTarget(): string {
  const normalized = CONFIGURED_TRADE_TARGET.trim();
  if (normalized.startsWith('0x')) {
    return normalized;
  }

  return `${SUI_PACKAGE_ID}::${normalized}`;
}

export function parseTarget(target: string): ParsedTarget {
  const parts = target.split('::');
  if (parts.length !== 3) {
    throw new Error(`Invalid NEXT_PUBLIC_SUI_TRADE_TARGET format: ${target}. Expected <package>::<module>::<function> or <module>::<function>.`);
  }

  return {
    packageId: parts[0],
    moduleName: parts[1],
    functionName: parts[2],
  };
}

function isTxContextParam(param: unknown): boolean {
  if (typeof param !== 'object' || param === null || !('MutableReference' in (param as Record<string, unknown>))) {
    return false;
  }
  const mutableRef = (param as { MutableReference?: unknown }).MutableReference;
  if (typeof mutableRef !== 'object' || mutableRef === null || !('Struct' in (mutableRef as Record<string, unknown>))) {
    return false;
  }
  const struct = (mutableRef as { Struct?: unknown }).Struct as { address?: string; module?: string; name?: string } | undefined;
  return struct?.address === '0x2' && struct?.module === 'tx_context' && struct?.name === 'TxContext';
}

function unwrapRefParam(param: unknown): unknown {
  if (typeof param !== 'object' || param === null) {
    return param;
  }

  const record = param as Record<string, unknown>;
  if ('Reference' in record) {
    return record.Reference;
  }
  if ('MutableReference' in record) {
    return record.MutableReference;
  }

  return param;
}

function isU64Param(param: unknown): boolean {
  return unwrapRefParam(param) === 'U64';
}

function isBoolParam(param: unknown): boolean {
  return unwrapRefParam(param) === 'Bool';
}

function getStructParamInfo(param: unknown): { address?: string; module?: string; name?: string; mutable: boolean } | null {
  if (typeof param !== 'object' || param === null) {
    return null;
  }

  const asRecord = param as Record<string, unknown>;
  if ('MutableReference' in asRecord) {
    const mutableRef = (asRecord as { MutableReference?: unknown }).MutableReference;
    if (typeof mutableRef === 'object' && mutableRef !== null && 'Struct' in (mutableRef as Record<string, unknown>)) {
      const struct = (mutableRef as { Struct?: unknown }).Struct as { address?: string; module?: string; name?: string } | undefined;
      return { ...struct, mutable: true };
    }
  }

  if ('Reference' in asRecord) {
    const ref = (asRecord as { Reference?: unknown }).Reference;
    if (typeof ref === 'object' && ref !== null && 'Struct' in (ref as Record<string, unknown>)) {
      const struct = (ref as { Struct?: unknown }).Struct as { address?: string; module?: string; name?: string } | undefined;
      return { ...struct, mutable: false };
    }
  }

  return null;
}

function isStringParam(param: unknown): boolean {
  const unwrapped = unwrapRefParam(param);
  if (unwrapped === 'String') {
    return true;
  }

  if (typeof unwrapped !== 'object' || unwrapped === null || !('Struct' in (unwrapped as Record<string, unknown>))) {
    return false;
  }

  const struct = (unwrapped as { Struct?: unknown }).Struct as { address?: string; module?: string; name?: string } | undefined;
  return struct?.address === '0x1' && struct?.module === 'string' && struct?.name === 'String';
}

function buildRegistryPayload(trade: TradeRequest, walletAddress: string): number[] {
  const payload = JSON.stringify({
    marketId: trade.marketId,
    side: trade.side,
    amountMist: Math.ceil(trade.amount * SUI_MIST),
    executionPriceMist: Math.ceil(trade.executionPrice * SUI_MIST),
    wallet: walletAddress,
    ts: trade.timestamp.toISOString(),
  });

  return Array.from(new TextEncoder().encode(payload));
}

export type TradeArgumentPreview = {
  kind: 'object' | 'vector_u8' | 'string' | 'u64' | 'bool';
  value: string | number | boolean;
};

export function buildTradeArgumentPreview(input: {
  parsedTarget: ParsedTarget;
  paramsWithoutCtx: unknown[];
  trade: TradeRequest;
  walletAddress: string;
  registryObjectId?: string;
  deepbookPoolObjectId?: string;
  deepbookBalanceManagerObjectId?: string;
  suiClockObjectId?: string;
  clientOrderId?: number;
}): TradeArgumentPreview[] {
  const {
    parsedTarget,
    paramsWithoutCtx,
    trade,
    walletAddress,
    registryObjectId,
    deepbookPoolObjectId,
    deepbookBalanceManagerObjectId,
    suiClockObjectId = '0x6',
    clientOrderId = 1,
  } = input;

  if (parsedTarget.moduleName === 'registry' && parsedTarget.functionName === 'add_key') {
    if (!registryObjectId || !isValidSuiHexAddress(registryObjectId)) {
      throw new Error('registry::add_key requires a valid registry object ID for argument mapping.');
    }
    return [
      { kind: 'object', value: registryObjectId },
      { kind: 'vector_u8', value: buildRegistryPayload(trade, walletAddress).length },
    ];
  }

  if (parsedTarget.moduleName === 'pool' && parsedTarget.functionName === 'place_limit_order') {
    if (!deepbookPoolObjectId || !isValidSuiHexAddress(deepbookPoolObjectId)) {
      throw new Error('DeepBook argument mapping requires a valid pool object ID.');
    }
    if (!deepbookBalanceManagerObjectId || !isValidSuiHexAddress(deepbookBalanceManagerObjectId)) {
      throw new Error('DeepBook argument mapping requires a valid balance manager object ID.');
    }

    const amountMist = Math.ceil(trade.amount * SUI_MIST);
    const priceMist = Math.ceil(trade.executionPrice * SUI_MIST);
    let seenU64 = 0;

    return paramsWithoutCtx.map((param) => {
      const structInfo = getStructParamInfo(param);
      if (structInfo?.mutable && structInfo.name === 'Pool') {
        return { kind: 'object', value: deepbookPoolObjectId };
      }
      if (structInfo?.mutable && structInfo.name === 'BalanceManager') {
        return { kind: 'object', value: deepbookBalanceManagerObjectId };
      }
      if (structInfo?.address === '0x2' && structInfo.module === 'clock' && structInfo.name === 'Clock') {
        return { kind: 'object', value: suiClockObjectId };
      }
      if (isU64Param(param)) {
        seenU64 += 1;
        if (seenU64 === 1) {
          return { kind: 'u64', value: clientOrderId };
        }
        if (seenU64 === 2) {
          return { kind: 'u64', value: priceMist };
        }
        if (seenU64 === 3) {
          return { kind: 'u64', value: amountMist };
        }
        return { kind: 'u64', value: 0 };
      }
      if (isBoolParam(param)) {
        return { kind: 'bool', value: trade.side === 'yes' };
      }

      throw new Error(`Unsupported DeepBook parameter type in preview mapping: ${JSON.stringify(param)}`);
    });
  }

  if (
    paramsWithoutCtx.length === 4
    && isStringParam(paramsWithoutCtx[0])
    && isStringParam(paramsWithoutCtx[1])
    && isU64Param(paramsWithoutCtx[2])
    && isU64Param(paramsWithoutCtx[3])
  ) {
    return [
      { kind: 'string', value: trade.marketId },
      { kind: 'string', value: trade.side },
      { kind: 'u64', value: Math.ceil(trade.amount * SUI_MIST) },
      { kind: 'u64', value: Math.ceil(trade.executionPrice * SUI_MIST) },
    ];
  }

  throw new Error(`Unsupported target signature mapping for ${parsedTarget.moduleName}::${parsedTarget.functionName}.`);
}

export function getTradePreflightIssues(marketId: string): string[] {
  const issues: string[] = [];

  let parsed: ParsedTarget;
  try {
    parsed = parseTarget(resolveTradeTarget());
  } catch (error) {
    issues.push(error instanceof Error ? error.message : 'Invalid trade target configuration.');
    return issues;
  }

  if (parsed.moduleName === 'pool' && parsed.functionName === 'place_limit_order') {
    if (!isValidSuiHexAddress(CONFIGURED_DEEPBOOK_POOL_OBJECT_ID)) {
      issues.push('Missing NEXT_PUBLIC_DEEPBOOK_POOL_OBJECT_ID for DeepBook place_limit_order.');
    }
    if (!isValidSuiHexAddress(CONFIGURED_DEEPBOOK_BALANCE_MANAGER_OBJECT_ID)) {
      issues.push('Missing NEXT_PUBLIC_DEEPBOOK_BALANCE_MANAGER_OBJECT_ID for DeepBook place_limit_order.');
    }
    if (!isValidSuiHexAddress(CONFIGURED_SUI_CLOCK_OBJECT_ID)) {
      issues.push('Invalid NEXT_PUBLIC_SUI_CLOCK_OBJECT_ID (expected Sui object id, default 0x6).');
    }
  }

  if (parsed.moduleName === 'registry' && parsed.functionName === 'add_key') {
    const registryObjectId = CONFIGURED_REGISTRY_OBJECT_ID || marketId;
    if (!isValidSuiHexAddress(registryObjectId)) {
      issues.push('registry::add_key requires NEXT_PUBLIC_SUI_REGISTRY_OBJECT_ID or a 0x... market ID.');
    }
  }

  return issues;
}

function stringifyMoveParam(param: unknown): string {
  if (typeof param === 'string') {
    return param.toLowerCase();
  }

  if (Array.isArray(param)) {
    return `[${param.map((item) => stringifyMoveParam(item)).join(', ')}]`;
  }

  if (typeof param !== 'object' || param === null) {
    return String(param);
  }

  const value = param as Record<string, unknown>;
  if ('MutableReference' in value) {
    return `&mut ${stringifyMoveParam(value.MutableReference)}`;
  }
  if ('Reference' in value) {
    return `&${stringifyMoveParam(value.Reference)}`;
  }
  if ('Struct' in value) {
    const struct = value.Struct as { address?: string; module?: string; name?: string; typeArguments?: unknown[] };
    const base = `${struct.address || '?'}::${struct.module || '?'}::${struct.name || '?'}`;
    if (!struct.typeArguments || struct.typeArguments.length === 0) {
      return base;
    }
    return `${base}<${struct.typeArguments.map((arg) => stringifyMoveParam(arg)).join(', ')}>`;
  }
  if ('Vector' in value) {
    return `vector<${stringifyMoveParam(value.Vector)}>`;
  }
  if ('TypeParameter' in value) {
    return `T${String(value.TypeParameter)}`;
  }

  return JSON.stringify(param);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('timeout')
    || message.includes('temporarily unavailable')
    || message.includes('network')
    || message.includes('429')
    || message.includes('rate limit')
    || message.includes('rpc')
  );
}

export function useTradeExecution() {
  const [tradeHistory, setTradeHistory] = useState<TradeHistory>({});
  const [positions, setPositions] = useState<Record<string, { yes: number; no: number }>>({});
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([]);
  const [lastTransactionDigest, setLastTransactionDigest] = useState<string | null>(null);
  const [lastTransactionNetwork, setLastTransactionNetwork] = useState<'testnet' | 'mainnet' | null>(null);
  const inFlightTradesRef = useRef<Set<string>>(new Set());

  const executeOnchainTransaction = async (trade: TradeRequest, totalCost: number) => {
    const preferredNetwork: 'testnet' | 'mainnet' = localStorage.getItem('preferredNetwork') === 'mainnet' ? 'mainnet' : 'testnet';
    const context = await getConnectedWalletContext(localStorage.getItem('walletId') || undefined);
    const client = new SuiClient({ url: getFullnodeUrl(preferredNetwork) });
    const tradeTarget = resolveTradeTarget();
    const parsedTarget = parseTarget(tradeTarget);

    const pkg = await client.getObject({
      id: SUI_PACKAGE_ID,
      options: { showType: true },
    });
    if (!pkg.data) {
      throw new Error(`Configured Sui package not found on ${preferredNetwork}: ${SUI_PACKAGE_ID}`);
    }

    const requiredNotionalMist = Math.ceil(totalCost * SUI_MIST);
    const balance = await client.getBalance({ owner: context.account.address, coinType: '0x2::sui::SUI' });
    const availableMist = Number(balance.totalBalance);

    if (Number.isFinite(availableMist) && availableMist < requiredNotionalMist) {
      throw new Error(`Insufficient balance: need ${(requiredNotionalMist / SUI_MIST).toFixed(4)} SUI, available ${(availableMist / SUI_MIST).toFixed(4)} SUI.`);
    }

    const normalizedModule = await client.getNormalizedMoveModule({
      package: parsedTarget.packageId,
      module: parsedTarget.moduleName,
    });
    const fnMeta = normalizedModule.exposedFunctions?.[parsedTarget.functionName];
    if (!fnMeta) {
      throw new Error(`Move function not found on-chain: ${tradeTarget}`);
    }
    const paramsWithoutCtx = (fnMeta.parameters || []).filter((param: unknown) => !isTxContextParam(param));

    let lastError: unknown = null;
    for (let attempt = 0; attempt <= TRADE_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const tx = new Transaction();
        tx.setGasBudget(5_000_000);

        let args: ReturnType<typeof tx.object | typeof tx.pure.string | typeof tx.pure.u64 | typeof tx.pure.vector>[] = [];

        // Exact encoding for the currently deployed package signature:
        // registry::add_key(&mut PubkeyRegistry, vector<u8>)
        if (parsedTarget.moduleName === 'registry' && parsedTarget.functionName === 'add_key') {
          const registryObjectId = CONFIGURED_REGISTRY_OBJECT_ID || trade.marketId;
          if (!isValidSuiHexAddress(registryObjectId)) {
            throw new Error(`registry::add_key requires a valid registry object ID. Set NEXT_PUBLIC_SUI_REGISTRY_OBJECT_ID or pass a 0x... market ID.`);
          }

          const keyBytes = buildRegistryPayload(trade, context.account.address);
          args = [
            tx.object(registryObjectId),
            tx.pure.vector('u8', keyBytes),
          ];
        } else if (parsedTarget.moduleName === 'pool' && parsedTarget.functionName === 'place_limit_order') {
          if (!isValidSuiHexAddress(CONFIGURED_DEEPBOOK_POOL_OBJECT_ID)) {
            throw new Error('DeepBook place_limit_order requires NEXT_PUBLIC_DEEPBOOK_POOL_OBJECT_ID (0x...).');
          }
          if (!isValidSuiHexAddress(CONFIGURED_DEEPBOOK_BALANCE_MANAGER_OBJECT_ID)) {
            throw new Error('DeepBook place_limit_order requires NEXT_PUBLIC_DEEPBOOK_BALANCE_MANAGER_OBJECT_ID (0x...).');
          }

          const amountMist = Math.ceil(trade.amount * SUI_MIST);
          const priceMist = Math.ceil(trade.executionPrice * SUI_MIST);
          const clientOrderId = Date.now();
          let seenU64 = 0;

          args = paramsWithoutCtx.map((param) => {
            const structInfo = getStructParamInfo(param);
            if (structInfo?.mutable && structInfo.name === 'Pool') {
              return tx.object(CONFIGURED_DEEPBOOK_POOL_OBJECT_ID);
            }
            if (structInfo?.mutable && structInfo.name === 'BalanceManager') {
              return tx.object(CONFIGURED_DEEPBOOK_BALANCE_MANAGER_OBJECT_ID);
            }
            if (structInfo?.address === '0x2' && structInfo.module === 'clock' && structInfo.name === 'Clock') {
              return tx.object(CONFIGURED_SUI_CLOCK_OBJECT_ID);
            }
            if (isU64Param(param)) {
              seenU64 += 1;
              if (seenU64 === 1) {
                return tx.pure.u64(clientOrderId);
              }
              if (seenU64 === 2) {
                return tx.pure.u64(priceMist);
              }
              if (seenU64 === 3) {
                return tx.pure.u64(amountMist);
              }
              return tx.pure.u64(0);
            }
            if (isBoolParam(param)) {
              return tx.pure.bool(trade.side === 'yes');
            }

            throw new Error(`Unsupported DeepBook place_limit_order parameter type: ${JSON.stringify(param)}`);
          });
        } else if (
          paramsWithoutCtx.length === 4
          && isStringParam(paramsWithoutCtx[0])
          && isStringParam(paramsWithoutCtx[1])
          && isU64Param(paramsWithoutCtx[2])
          && isU64Param(paramsWithoutCtx[3])
        ) {
          // Backward-compatible encoding for trade-style entrypoints.
          args = [
            tx.pure.string(trade.marketId),
            tx.pure.string(trade.side),
            tx.pure.u64(Math.ceil(trade.amount * SUI_MIST)),
            tx.pure.u64(Math.ceil(trade.executionPrice * SUI_MIST)),
          ];
        } else {
          throw new Error(
            `Unsupported Move signature for ${tradeTarget}: ${JSON.stringify(paramsWithoutCtx)}. Configure NEXT_PUBLIC_SUI_TRADE_TARGET to a supported function.`
          );
        }

        tx.moveCall({
          target: tradeTarget,
          arguments: args,
        });

        const result = await signAndExecuteWalletTransaction(context, tx, preferredNetwork);
        if (!result?.digest) {
          throw new Error('Transaction did not return a digest.');
        }

        emitObservabilityEvent('trade', 'execute_success', 'info', {
          digest: result.digest,
          network: preferredNetwork,
          marketId: trade.marketId,
          side: trade.side,
        });

        return {
          digest: result.digest,
          network: preferredNetwork,
        };
      } catch (error) {
        lastError = error;
        const canRetry = attempt < TRADE_RETRY_ATTEMPTS && isRetryableError(error);
        if (!canRetry) {
          emitObservabilityEvent('trade', 'execute_failed', 'error', {
            marketId: trade.marketId,
            side: trade.side,
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
        await delay(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Transaction failed after retry policy exhausted.');
  };

  const executeTrade = async (trade: TradeRequest): Promise<TradeResult> => {
    const totalCost = trade.amount * trade.executionPrice;
    if (totalCost > MAX_NOTIONAL_SUI) {
      return {
        id: `trade_rejected_${Date.now()}`,
        status: 'error',
        stage: 'failed',
        ...trade,
        totalCost,
        position: 0,
        timestamp: new Date(),
        error: `Trade exceeds notional risk limit (${MAX_NOTIONAL_SUI.toLocaleString()} SUI).`,
      };
    }

    const idempotencyKey = [
      trade.marketId,
      trade.side,
      trade.amount.toFixed(6),
      trade.executionPrice.toFixed(6),
    ].join(':');

    if (inFlightTradesRef.current.has(idempotencyKey)) {
      return {
        id: `trade_duplicate_${Date.now()}`,
        status: 'error',
        stage: 'failed',
        ...trade,
        totalCost,
        position: 0,
        timestamp: new Date(),
        error: 'Duplicate trade request already in-flight. Wait for confirmation before retrying.',
      };
    }

    inFlightTradesRef.current.add(idempotencyKey);

    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const result: TradeResult = {
      id: tradeId,
      status: 'pending',
      stage: 'approval',
      ...trade,
      totalCost,
      position: trade.amount,
      timestamp: new Date(),
    };

    // Add to history
    setTradeHistory(prev => ({
      ...prev,
      [trade.marketId]: [...(prev[trade.marketId] || []), result],
    }));

    addToast('Awaiting wallet approval...', 'info');

    let txOutcome: { digest: string; network: 'testnet' | 'mainnet' };

    try {
      txOutcome = await executeOnchainTransaction(trade, totalCost);
    } catch (err) {
      const failedResult: TradeResult = {
        ...result,
        status: 'error',
        stage: 'failed',
        error: err instanceof Error ? err.message : 'Wallet transaction failed.',
      };

      setTradeHistory(prev => ({
        ...prev,
        [trade.marketId]: prev[trade.marketId].map(t => t.id === tradeId ? failedResult : t),
      }));

      addToast(`Transaction failed: ${failedResult.error}`, 'error');
      inFlightTradesRef.current.delete(idempotencyKey);
      return failedResult;
    }

    const submittedResult: TradeResult = {
      ...result,
      stage: 'submitted',
      transactionHash: txOutcome.digest,
    };

    setLastTransactionDigest(txOutcome.digest);
    setLastTransactionNetwork(txOutcome.network);

    setTradeHistory(prev => ({
      ...prev,
      [trade.marketId]: prev[trade.marketId].map(t => t.id === tradeId ? submittedResult : t),
    }));

    addToast(`Transaction submitted: ${submittedResult.transactionHash}`, 'info');

    // Mark as success
    const successResult: TradeResult = {
      ...submittedResult,
      status: 'success',
      stage: 'confirmed',
    };

    setTradeHistory(prev => ({
      ...prev,
      [trade.marketId]: prev[trade.marketId].map(t => t.id === tradeId ? successResult : t),
    }));

    // Update positions only after confirmation
    setPositions(prev => ({
      ...prev,
      [trade.marketId]: {
        yes: (prev[trade.marketId]?.yes || 0) + (trade.side === 'yes' ? trade.amount : 0),
        no: (prev[trade.marketId]?.no || 0) + (trade.side === 'no' ? trade.amount : 0),
      },
    }));

    // Show success toast
    addToast(`Transaction confirmed: ${trade.side.toUpperCase()} ${trade.amount.toFixed(2)} SUI`, 'success');
    addToast(`View on SuiScan: https://suiscan.xyz/${txOutcome.network}/tx/${submittedResult.transactionHash}`, 'info');

    inFlightTradesRef.current.delete(idempotencyKey);

    return successResult;
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return {
    executeTrade,
    tradeHistory,
    positions,
    toasts,
    addToast,
    removeToast,
    lastTransactionDigest,
    lastTransactionNetwork,
  };
}

interface TradeFormProps {
  marketId: string;
  yesPrice: number;
  noPrice: number;
  initialSide?: 'yes' | 'no';
  isWalletConnected: boolean;
  onTradeExecuted?: (result: TradeResult) => void;
  onExecuteTrade: (trade: TradeRequest) => Promise<TradeResult>;
}

export function TradeForm({
  marketId,
  yesPrice,
  noPrice,
  initialSide = 'yes',
  isWalletConnected,
  onTradeExecuted,
  onExecuteTrade,
}: TradeFormProps) {
  const [amount, setAmount] = useState('10');
  const [side, setSide] = useState<'yes' | 'no'>(initialSide);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStage, setExecutionStage] = useState<'idle' | 'approval' | 'submitted' | 'confirmed' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const preflightIssues = useMemo(() => getTradePreflightIssues(marketId), [marketId]);
  const [targetIntrospection, setTargetIntrospection] = useState<TargetIntrospectionState>(() => ({
    status: 'idle',
    target: resolveTradeTarget(),
    network: 'testnet',
  }));

  useEffect(() => {
    let active = true;

    const inspectTarget = async () => {
      const preferredNetwork: 'testnet' | 'mainnet' = localStorage.getItem('preferredNetwork') === 'mainnet' ? 'mainnet' : 'testnet';
      const target = resolveTradeTarget();

      setTargetIntrospection({
        status: 'loading',
        target,
        network: preferredNetwork,
        message: 'Loading on-chain target metadata...',
      });

      try {
        const parsedTarget = parseTarget(target);
        const client = new SuiClient({ url: getFullnodeUrl(preferredNetwork) });
        const normalizedModule = await client.getNormalizedMoveModule({
          package: parsedTarget.packageId,
          module: parsedTarget.moduleName,
        });
        const fnMeta = normalizedModule.exposedFunctions?.[parsedTarget.functionName];

        if (!fnMeta) {
          throw new Error(`Target function not found on ${preferredNetwork}: ${target}`);
        }

        const parameterTypes = (fnMeta.parameters || []).map((param: unknown) => stringifyMoveParam(param));
        const returnTypes = (fnMeta.return || []).map((param: unknown) => stringifyMoveParam(param));

        if (!active) {
          return;
        }

        setTargetIntrospection({
          status: 'ready',
          target,
          network: preferredNetwork,
          visibility: fnMeta.visibility,
          isEntry: !!fnMeta.isEntry,
          parameterTypes,
          returnTypes,
          message: 'Target metadata loaded from chain.',
        });
        emitObservabilityEvent('trade', 'introspection_ready', 'info', {
          target,
          network: preferredNetwork,
          isEntry: !!fnMeta.isEntry,
          parameterCount: parameterTypes.length,
        });
      } catch (introspectionError) {
        if (!active) {
          return;
        }

        setTargetIntrospection({
          status: 'error',
          target,
          network: preferredNetwork,
          message: introspectionError instanceof Error ? introspectionError.message : 'Failed to inspect trade target.',
        });
        emitObservabilityEvent('trade', 'introspection_failed', 'warn', {
          target,
          network: preferredNetwork,
          message: introspectionError instanceof Error ? introspectionError.message : String(introspectionError),
        });
      }
    };

    inspectTarget();

    return () => {
      active = false;
    };
  }, [marketId]);

  useEffect(() => {
    setSide(initialSide);
  }, [initialSide, marketId]);

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isWalletConnected) {
      setError('Please connect your wallet');
      return;
    }

    if (preflightIssues.length > 0) {
      setError(preflightIssues[0]);
      emitObservabilityEvent('trade', 'preflight_blocked', 'warn', {
        marketId,
        issues: preflightIssues,
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount > 1000000) {
      setError('Amount exceeds maximum allowed');
      return;
    }

    setIsExecuting(true);
    setExecutionStage('approval');

    const pendingTimer = setTimeout(() => {
      setExecutionStage('submitted');
    }, 900);

    try {
      const result = await onExecuteTrade({
        marketId,
        side,
        amount: numAmount,
        executionPrice: price,
        timestamp: new Date(),
      });

      if (result.status === 'success') {
        clearTimeout(pendingTimer);
        setExecutionStage('confirmed');
        setAmount('');
        onTradeExecuted?.(result);
        setTimeout(() => setExecutionStage('idle'), 1200);
      } else {
        clearTimeout(pendingTimer);
        setExecutionStage('failed');
        setError(result.error || 'Trade execution failed');
      }
    } catch (err) {
      clearTimeout(pendingTimer);
      setExecutionStage('failed');
      setError('Trade failed: ' + (err as any).message);
    } finally {
      setIsExecuting(false);
    }
  };

  const price = side === 'yes' ? yesPrice : noPrice;
  const totalCost = parseFloat(amount) * price || 0;

  return (
    <form onSubmit={handleTrade} style={{ padding: '1.5rem', backgroundColor: '#0ea5e922', borderRadius: '0.75rem', border: '1px solid #06b6d4' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', margin: '0 0 1rem 0', color: '#e2e8f0' }}>
        Place Trade
      </h3>

      {/* Amount Input */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
          Amount (SUI)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          disabled={isExecuting}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #334155',
            borderRadius: '0.375rem',
            fontFamily: 'inherit',
            backgroundColor: '#0f172a',
            color: '#e2e8f0',
            opacity: isExecuting ? 0.6 : 1,
            cursor: isExecuting ? 'not-allowed' : 'text',
          }}
        />
      </div>

      {/* Side Selection */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>
          Position
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setSide('yes')}
            disabled={isExecuting}
            style={{
              padding: '0.75rem',
              border: `2px solid ${side === 'yes' ? '#34d399' : '#334155'}`,
              borderRadius: '0.375rem',
              backgroundColor: side === 'yes' ? '#034e3b' : '#0f172a',
              color: side === 'yes' ? '#34d399' : '#94a3b8',
              fontWeight: '600',
              cursor: isExecuting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isExecuting ? 0.6 : 1,
            }}
          >
            ✓ Buy YES @ {yesPrice.toFixed(4)}
          </button>
          <button
            type="button"
            onClick={() => setSide('no')}
            disabled={isExecuting}
            style={{
              padding: '0.75rem',
              border: `2px solid ${side === 'no' ? '#f87171' : '#334155'}`,
              borderRadius: '0.375rem',
              backgroundColor: side === 'no' ? '#7f1d1d' : '#0f172a',
              color: side === 'no' ? '#f87171' : '#94a3b8',
              fontWeight: '600',
              cursor: isExecuting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isExecuting ? 0.6 : 1,
            }}
          >
            ✗ Buy NO @ {noPrice.toFixed(4)}
          </button>
        </div>
      </div>

      {/* Trade Summary */}
      {amount && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '0.375rem', border: '1px solid #334155', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ color: '#94a3b8' }}>Price per share:</span>
            <span style={{ color: '#cbd5e1', fontWeight: '600' }}>{price.toFixed(4)} SUI</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Total cost:</span>
            <span style={{ color: '#34d399', fontWeight: '600' }}>{totalCost.toFixed(2)} SUI</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#7f1d1d', borderRadius: '0.375rem', border: '1px solid #f87171', color: '#fca5a5', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Trade Target Introspection */}
      <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '0.375rem', border: '1px solid #334155', fontSize: '0.8rem', color: '#cbd5e1' }}>
        <div style={{ fontWeight: 700, marginBottom: '0.35rem', color: '#e2e8f0' }}>Trade target introspection</div>
        <div style={{ marginBottom: '0.2rem' }}>
          Network: <span style={{ color: '#93c5fd' }}>{targetIntrospection.network}</span>
        </div>
        <div style={{ marginBottom: '0.35rem', wordBreak: 'break-all' }}>
          Target: <span style={{ color: '#7dd3fc' }}>{targetIntrospection.target}</span>
        </div>
        {targetIntrospection.status === 'loading' && (
          <div style={{ color: '#7dd3fc' }}>{targetIntrospection.message}</div>
        )}
        {targetIntrospection.status === 'error' && (
          <div style={{ color: '#fca5a5' }}>{targetIntrospection.message}</div>
        )}
        {targetIntrospection.status === 'ready' && (
          <>
            <div style={{ marginBottom: '0.2rem' }}>
              Visibility: <span style={{ color: '#86efac' }}>{targetIntrospection.visibility || 'unknown'}</span>
              {' · '}
              Entry: <span style={{ color: '#86efac' }}>{targetIntrospection.isEntry ? 'yes' : 'no'}</span>
            </div>
            <div style={{ marginBottom: '0.25rem', color: '#94a3b8' }}>Parameters</div>
            {(targetIntrospection.parameterTypes || []).length === 0 && (
              <div style={{ marginBottom: '0.35rem', color: '#cbd5e1' }}>None</div>
            )}
            {(targetIntrospection.parameterTypes || []).map((param, index) => (
              <div key={`${param}-${index}`} style={{ marginBottom: '0.2rem', color: '#cbd5e1' }}>{index + 1}. {param}</div>
            ))}
            <div style={{ marginTop: '0.35rem', marginBottom: '0.25rem', color: '#94a3b8' }}>Returns</div>
            {(targetIntrospection.returnTypes || []).length === 0 && (
              <div style={{ color: '#cbd5e1' }}>None</div>
            )}
            {(targetIntrospection.returnTypes || []).map((ret, index) => (
              <div key={`${ret}-${index}`} style={{ marginBottom: '0.2rem', color: '#cbd5e1' }}>{index + 1}. {ret}</div>
            ))}
          </>
        )}
      </div>

      {/* Preflight Readiness */}
      {preflightIssues.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#7c2d12', borderRadius: '0.375rem', border: '1px solid #fb923c', color: '#fed7aa', fontSize: '0.875rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Trade preflight incomplete</div>
          {preflightIssues.map((issue) => (
            <div key={issue} style={{ marginBottom: '0.2rem' }}>• {issue}</div>
          ))}
        </div>
      )}

      {/* Execution Progress */}
      {isExecuting && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#082f49', borderRadius: '0.375rem', border: '1px solid #0ea5e9', color: '#7dd3fc', fontSize: '0.875rem' }}>
          {executionStage === 'approval' && '🔐 Approve transaction in wallet...'}
          {executionStage === 'submitted' && '⏳ Transaction pending confirmation...'}
        </div>
      )}

      {!isExecuting && executionStage === 'confirmed' && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#064e3b', borderRadius: '0.375rem', border: '1px solid #34d399', color: '#6ee7b7', fontSize: '0.875rem' }}>
          ✅ Transaction confirmed on-chain.
        </div>
      )}

      {/* Execute Button */}
      <button
        type="submit"
        disabled={isExecuting || !isWalletConnected || !amount || preflightIssues.length > 0}
        style={{
          width: '100%',
          padding: '0.875rem',
          background: isExecuting ? '#64748b' : 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          fontWeight: '600',
          cursor: isExecuting || !isWalletConnected || !amount || preflightIssues.length > 0 ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem',
          transition: 'all 0.2s',
          boxShadow: isExecuting ? 'none' : '0 4px 12px rgba(6, 182, 212, 0.2)',
          opacity: isExecuting || !isWalletConnected || preflightIssues.length > 0 ? 0.6 : 1,
        }}
      >
        {isExecuting ? (executionStage === 'approval' ? 'Approve in Wallet' : 'Confirming Transaction...') : 'Execute Trade'}
      </button>
    </form>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      maxWidth: '400px',
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid',
            backgroundColor: toast.type === 'success' ? '#064e3b' : toast.type === 'error' ? '#7f1d1d' : '#0c4a6e',
            borderColor: toast.type === 'success' ? '#34d399' : toast.type === 'error' ? '#f87171' : '#0ea5e9',
            color: toast.type === 'success' ? '#34d399' : toast.type === 'error' ? '#fca5a5' : '#0ea5e9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          <span>
            {toast.type === 'success' ? '✓ ' : toast.type === 'error' ? '✗ ' : 'ℹ️ '}
            {toast.message}
          </span>
          <button
            onClick={() => onRemove(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '1.25rem',
              marginLeft: '1rem',
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
