// SPDX-License-Identifier: Apache-2.0
/**
 * Structured agent logger.
 *
 * Writes JSON lines to stdout (info/debug) and stderr (warn/error) so output
 * is machine-readable in production log aggregators (Grafana Loki, Datadog,
 * CloudWatch, etc.) while staying human-readable in dev via LOG_PRETTY=1.
 *
 * Usage:
 *   const logger = require('../lib/logger').create('ForecastToTrade');
 *   logger.info('Trade plan generated', { decision: 'buy_yes', stake: '25' });
 *   logger.warn('Risk check blocked trade', { reason: 'exposure limit' });
 *   logger.error('Execution failed', { err: error.message });
 *   logger.debug('Market odds fetched', { impliedProb: 0.62 });   // only if LOG_LEVEL=debug
 *
 *   // Bind a correlation ID for a request/operation scope:
 *   const reqLog = logger.withContext({ correlationId: req.headers['x-correlation-id'] });
 *   reqLog.info('Processing trade request');
 *
 * Environment controls:
 *   LOG_LEVEL=debug|info|warn|error  (default: info)
 *   LOG_PRETTY=1                     (human-readable output, not JSON)
 */

'use strict';

const crypto = require('crypto');

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;
const PRETTY = process.env.LOG_PRETTY === '1';

function generateCorrelationId() {
  return crypto.randomUUID();
}

function emit(stream, level, component, message, data, context) {
  if (LEVELS[level] < MIN_LEVEL) return;

  const ts = new Date().toISOString();

  if (PRETTY) {
    const prefix = `[${ts}] [${level.toUpperCase().padEnd(5)}] [${component}]`;
    const corrPart = context?.correlationId ? ` [cid:${context.correlationId}]` : '';
    const detail = data && Object.keys(data).length > 0
      ? ' ' + JSON.stringify(data)
      : '';
    stream.write(`${prefix}${corrPart} ${message}${detail}\n`);
    return;
  }

  const entry = { ts, level, component, message };
  if (context?.correlationId) entry.correlationId = context.correlationId;
  if (data && Object.keys(data).length > 0) entry.data = data;
  stream.write(JSON.stringify(entry) + '\n');
}

function create(component, context = {}) {
  const logger = {
    debug: (msg, data = {}) => emit(process.stdout, 'debug', component, msg, data, context),
    info:  (msg, data = {}) => emit(process.stdout, 'info',  component, msg, data, context),
    warn:  (msg, data = {}) => emit(process.stderr, 'warn',  component, msg, data, context),
    error: (msg, data = {}) => emit(process.stderr, 'error', component, msg, data, context),
    withContext: (extraContext) => create(component, { ...context, ...extraContext }),
  };
  return logger;
}

module.exports = { create, generateCorrelationId };
