/**
 * CopilotKit Action Handler Registration
 * 
 * This file registers the copilot action handler and wires it to the
 * CopilotKit runtime. It must be called in a client component before
 * any copilot actions can be executed.
 */

'use client';

import { registerCopilotActionHandler } from './copilot-action-handler';
import { copilotBridge, type CopilotContext } from './copilot-bridge';
import { getConnectedWalletContext } from './sui/wallet-standard';

// ─── Global action handler registration ──────────────────────────────────────
let handlerCleanup: (() => void) | null = null;

export async function registerCopilotActions(): Promise<void> {
  // Initialize wallet context for all actions
  const getWalletContext = async (walletId?: string) => {
    try {
      return await getConnectedWalletContext(walletId);
    } catch (error) {
      console.error('Failed to connect wallet for Copilot action:', error);
      throw new Error('Wallet connection required for trade actions');
    }
  };

  // Get current context from bridge
  const getContext = (): CopilotContext => copilotBridge.getContext();
  
  const getTranscript = (): import('./copilot-bridge').CopilotExecutionTranscript | null => {
    return copilotBridge.getLastTranscript();
  };

  // Register the action handler
  handlerCleanup = registerCopilotActionHandler({
    getContext,
    getTranscript,
    getWalletContext,
  });

  // Listen for wallet updates and refresh context
  window.addEventListener('sapm:wallet-updated', (event: Event) => {
    const detail = (event as CustomEvent).detail as { connected: boolean; address: string | null };
    copilotBridge.setContext({
      walletConnected: detail.connected,
      walletAddress: detail.address,
      lastUpdatedAt: Date.now(),
    });
  });

  // Emit observability event
  console.log('[Copilot] Action handler registered successfully');
}

// ─── Context synchronization utilities ───────────────────────────────────────
export function refreshCopilotContext(): void {
  const walletConnected = typeof window !== 'undefined' && 
    localStorage.getItem('walletId') !== null;
  
  const walletAddress = typeof window !== 'undefined' && 
    localStorage.getItem('walletAddress');

  copilotBridge.setContext({
    walletConnected: Boolean(walletAddress),
    walletAddress: walletAddress || null,
    lastUpdatedAt: Date.now(),
  });
}

// ─── Lifecycle hook for Next.js App Router ──────────────────────────────────
if (typeof window !== 'undefined') {
  // Auto-register on mount if not already registered
  if (!handlerCleanup) {
    void registerCopilotActions();
  }
}

export default {
  registerCopilotActions,
  refreshCopilotContext,
};
