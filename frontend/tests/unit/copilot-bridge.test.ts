import { copilotBridge } from '@/services/copilot-bridge';
import { beforeEach, describe, expect, test } from '@jest/globals';

describe('CopilotBridge', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await copilotBridge.initialize({
      actionTimeoutMs: 5000,
      maxRetries: 0,
      persistLocalState: false,
      transcriptPostUrl: '',
    });
    await copilotBridge.clearQueue();
    copilotBridge.setContext({
      walletConnected: true,
      walletAddress: '0xabc',
      activeMarketId: '0x1234',
      activeMarketQuestion: 'Will SUI hold above $1?',
      activeMarketYesPrice: 0.61,
      activeMarketNoPrice: 0.39,
      activeMarketRisk: 'Medium',
    });
  });

  test('generates executable action cards from judge-mode prompt', async () => {
    const plan = await copilotBridge.handleAgentIntent({
      type: 'plan-request',
      prompt: 'prepare judge mode run with archive',
      priority: 'high',
    });

    expect(plan.actions.length).toBeGreaterThan(0);
    expect(plan.actions.some((action) => action.type === 'run-judge-mode')).toBe(true);
    expect(plan.actions.some((action) => action.type === 'archive-snapshot')).toBe(true);
  });

  test('executes queued action through window event result channel', async () => {
    const plan = await copilotBridge.handleAgentIntent({
      type: 'plan-request',
      prompt: 'refresh status',
    });

    const action = plan.actions[0];
    expect(action).toBeDefined();

    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; type: string }>).detail;
      if (!detail || detail.id !== action.id) {
        return;
      }
      window.dispatchEvent(new CustomEvent('sapm:copilot-action-result', {
        detail: {
          id: action.id,
          ok: true,
          message: 'ok',
        },
      }));
    };

    window.addEventListener('sapm:copilot-action-request', listener as EventListener);
    const result = await copilotBridge.executeAction(action.id);
    window.removeEventListener('sapm:copilot-action-request', listener as EventListener);

    expect(result.status).toBe('completed');
    expect(result.resultMessage).toBe('ok');
  });

  test('runs queued actions and stops on first failure with transcript', async () => {
    const plan = await copilotBridge.handleAgentIntent({
      type: 'plan-request',
      prompt: 'refresh status and sync onchain market',
      priority: 'high',
    });

    expect(plan.actions.length).toBeGreaterThanOrEqual(2);

    let callCount = 0;
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; type: string }>).detail;
      if (!detail) {
        return;
      }

      callCount += 1;
      window.dispatchEvent(new CustomEvent('sapm:copilot-action-result', {
        detail: {
          id: detail.id,
          ok: callCount !== 1,
          message: callCount === 1 ? 'first failed' : 'ok',
        },
      }));
    };

    window.addEventListener('sapm:copilot-action-request', listener as EventListener);
    const transcript = await copilotBridge.executeQueuedActions({ stopOnFailure: true });
    window.removeEventListener('sapm:copilot-action-request', listener as EventListener);

    expect(transcript.total).toBe(plan.actions.length);
    expect(transcript.failed).toBe(1);
    expect(transcript.completed).toBe(0);
    expect(transcript.aborted).toBe(true);
    expect(transcript.entries).toHaveLength(1);
    expect(copilotBridge.getLastTranscript()?.id).toBe(transcript.id);
  });

  test('runs queued actions in continue-on-failure mode', async () => {
    const plan = await copilotBridge.handleAgentIntent({
      type: 'plan-request',
      prompt: 'refresh status and sync onchain market',
      priority: 'high',
    });

    expect(plan.actions.length).toBeGreaterThanOrEqual(2);

    let callCount = 0;
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; type: string }>).detail;
      if (!detail) {
        return;
      }

      callCount += 1;
      window.dispatchEvent(new CustomEvent('sapm:copilot-action-result', {
        detail: {
          id: detail.id,
          ok: callCount !== 1,
          message: callCount === 1 ? 'first failed' : 'ok',
        },
      }));
    };

    window.addEventListener('sapm:copilot-action-request', listener as EventListener);
    const transcript = await copilotBridge.executeQueuedActions({ stopOnFailure: false });
    window.removeEventListener('sapm:copilot-action-request', listener as EventListener);

    expect(transcript.total).toBe(plan.actions.length);
    expect(transcript.failed).toBe(1);
    expect(transcript.completed).toBe(plan.actions.length - 1);
    expect(transcript.aborted).toBe(false);
    expect(transcript.stopOnFailure).toBe(false);
    expect(transcript.entries).toHaveLength(plan.actions.length);
  });

  test('blocks preflight for judge mode when wallet is disconnected', async () => {
    copilotBridge.setContext({
      walletConnected: false,
      walletAddress: null,
      activeMarketId: '0x1234',
    });

    const plan = await copilotBridge.handleAgentIntent({
      type: 'plan-request',
      prompt: 'run judge mode now',
      priority: 'high',
    });

    const judgeAction = plan.actions.find((action) => action.type === 'run-judge-mode');
    expect(judgeAction).toBeDefined();

    const result = await copilotBridge.executeAction(judgeAction!.id);
    expect(result.status).toBe('failed');
    expect(result.resultMessage).toContain('Preflight blocked');
  });

  test('cancels active run-all execution', async () => {
    const plan = await copilotBridge.handleAgentIntent({
      type: 'plan-request',
      prompt: 'refresh status',
      priority: 'high',
    });

    expect(plan.actions.length).toBeGreaterThan(0);

    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (!detail?.id) {
        return;
      }
      // Intentionally do not emit a result event: cancellation should abort dispatch.
    };

    window.addEventListener('sapm:copilot-action-request', listener as EventListener);
    const runPromise = copilotBridge.executeQueuedActions({ stopOnFailure: true });
    copilotBridge.cancelQueueExecution();
    const transcript = await runPromise;
    window.removeEventListener('sapm:copilot-action-request', listener as EventListener);

    expect(transcript.aborted).toBe(true);
    expect(transcript.total).toBeGreaterThanOrEqual(1);
    expect(transcript.entries.length).toBeLessThanOrEqual(transcript.total);
  });
});
