// SPDX-License-Identifier: Apache-2.0

const Orchestrator = require('../core/orchestrator');

describe('Canonical Ingress Validator Adapter', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  test('rejects non-envelope payload and stores policy error by correlationId', () => {
    const badMessage = {
      correlationId: 'corr-12345',
      payload: {
        marketId: '0x1234',
      },
    };

    const result = orchestrator.ingestCanonicalMessage(badMessage);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('POLICY_ENVELOPE_REJECTED');
    expect(result.correlationId).toBe('corr-12345');

    const errors = orchestrator.getPolicyErrors('corr-12345');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe('POLICY_ENVELOPE_REJECTED');
  });

  test('accepts valid canonical envelope with supported payload', () => {
    const envelope = {
      schemaVersion: '1.0.0',
      payloadType: 'agent_intention',
      messageId: 'msg-0000000001',
      timestamp: new Date().toISOString(),
      source: {
        service: 'orchestrator-tests',
        layer: 'orchestrator',
      },
      correlationId: 'corr-abc-001',
      payload: {
        schemaVersion: '1.0.0',
        intentId: 'intent-00000001',
        marketId: '0x1234abcd',
        intentType: 'trade_plan',
        confidence: 0.72,
        constraints: {
          maxNotionalSui: 250,
          requiresHumanApproval: true,
          maxSlippageBps: 120,
        },
        proposedAction: {
          side: 'yes',
          sizeSui: 10,
          limitPrice: 0.57,
        },
        explainability: {
          rationale: 'Test rationale',
          toolTrace: ['fetch-market', 'evaluate-risk'],
        },
      },
    };

    const result = orchestrator.ingestCanonicalMessage(envelope);
    expect(result.ok).toBe(true);
    expect(result.correlationId).toBe('corr-abc-001');
    expect(result.envelope).toBeDefined();
  });
});