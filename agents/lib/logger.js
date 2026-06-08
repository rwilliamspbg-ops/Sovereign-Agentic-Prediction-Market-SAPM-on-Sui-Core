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
 * Environment controls:
 *   LOG_LEVEL=debug|info|warn|error  (default: info)
 *   LOG_PRETTY=1                     (human-readable output, not JSON)
 */

'use strict';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;
const PRETTY = process.env.LOG_PRETTY === '1';

function emit(stream, level, component, message, data) {
  if (LEVELS[level] < MIN_LEVEL) return;

  const ts = new Date().toISOString();

  if (PRETTY) {
    const prefix = `[${ts}] [${level.toUpperCase().padEnd(5)}] [${component}]`;
    const detail = data && Object.keys(data).length > 0
      ? ' ' + JSON.stringify(data)
      : '';
    stream.write(`${prefix} ${message}${detail}\n`);
    return;
  }

  const entry = { ts, level, component, message };
  if (data && Object.keys(data).length > 0) entry.data = data;
  stream.write(JSON.stringify(entry) + '\n');
}

function create(component) {
  return {
    debug: (msg, data = {}) => emit(process.stdout, 'debug', component, msg, data),
    info:  (msg, data = {}) => emit(process.stdout, 'info',  component, msg, data),
    warn:  (msg, data = {}) => emit(process.stderr, 'warn',  component, msg, data),
    error: (msg, data = {}) => emit(process.stderr, 'error', component, msg, data),
  };
}

module.exports = { create };
