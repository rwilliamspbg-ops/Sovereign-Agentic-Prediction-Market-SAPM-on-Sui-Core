// SPDX-License-Identifier: Apache-2.0
'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

describe('agents/lib/logger', () => {
  let originalEnv;
  before(() => { originalEnv = { ...process.env }; });
  after(() => { Object.assign(process.env, originalEnv); delete process.env.LOG_PRETTY; delete process.env.LOG_LEVEL; });

  it('emits JSON to stdout for info', (t) => {
    delete require.cache[require.resolve('./logger')];
    process.env.LOG_LEVEL = 'info';
    delete process.env.LOG_PRETTY;

    const lines = [];
    const fakeStdout = { write: (s) => lines.push(s) };

    // Patch process.stdout temporarily
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = (s) => { lines.push(s); return true; };

    const { create } = require('./logger');
    const log = create('TestComp');
    log.info('hello', { key: 'val' });

    process.stdout.write = orig;

    assert.ok(lines.length > 0, 'should have written at least one line');
    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.level, 'info');
    assert.equal(parsed.component, 'TestComp');
    assert.equal(parsed.message, 'hello');
    assert.equal(parsed.data.key, 'val');
  });

  it('suppresses debug when LOG_LEVEL=info', () => {
    delete require.cache[require.resolve('./logger')];
    process.env.LOG_LEVEL = 'info';

    const lines = [];
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = (s) => { lines.push(s); return true; };

    const { create } = require('./logger');
    const log = create('TestComp');
    log.debug('should be suppressed');

    process.stdout.write = orig;
    assert.equal(lines.length, 0, 'debug should be suppressed at info level');
  });

  it('emits pretty output with LOG_PRETTY=1', () => {
    delete require.cache[require.resolve('./logger')];
    process.env.LOG_LEVEL = 'info';
    process.env.LOG_PRETTY = '1';

    const lines = [];
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = (s) => { lines.push(s); return true; };

    const { create } = require('./logger');
    const log = create('PrettyComp');
    log.info('pretty message', { x: 1 });

    process.stdout.write = orig;
    assert.ok(lines[0].includes('[INFO ]'), 'should have INFO label');
    assert.ok(lines[0].includes('[PrettyComp]'), 'should include component');
    assert.ok(lines[0].includes('pretty message'), 'should include message');
  });

  it('emits correlationId in JSON output when set via withContext', () => {
    delete require.cache[require.resolve('./logger')];
    process.env.LOG_LEVEL = 'info';
    delete process.env.LOG_PRETTY;

    const lines = [];
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = (s) => { lines.push(s); return true; };

    const { create } = require('./logger');
    const log = create('TraceComp').withContext({ correlationId: 'test-cid-001' });
    log.info('traced event', { op: 'trade' });

    process.stdout.write = orig;
    assert.ok(lines.length > 0, 'should emit a line');
    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.correlationId, 'test-cid-001');
    assert.equal(parsed.component, 'TraceComp');
    assert.equal(parsed.message, 'traced event');
  });

  it('withContext does not bleed correlationId to sibling loggers', () => {
    delete require.cache[require.resolve('./logger')];
    process.env.LOG_LEVEL = 'info';
    delete process.env.LOG_PRETTY;

    const lines = [];
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = (s) => { lines.push(s); return true; };

    const { create } = require('./logger');
    const base = create('BaseComp');
    const withCid = base.withContext({ correlationId: 'isolated-cid' });
    base.info('base log');
    withCid.info('scoped log');

    process.stdout.write = orig;
    assert.equal(lines.length, 2);
    const baseParsed = JSON.parse(lines[0]);
    const scopedParsed = JSON.parse(lines[1]);
    assert.equal(baseParsed.correlationId, undefined, 'base should not have correlationId');
    assert.equal(scopedParsed.correlationId, 'isolated-cid');
  });

  it('generateCorrelationId returns a UUID-shaped string', () => {
    delete require.cache[require.resolve('./logger')];
    const { generateCorrelationId } = require('./logger');
    const id = generateCorrelationId();
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('emits correlationId in pretty output via withContext', () => {
    delete require.cache[require.resolve('./logger')];
    process.env.LOG_LEVEL = 'info';
    process.env.LOG_PRETTY = '1';

    const lines = [];
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = (s) => { lines.push(s); return true; };

    const { create } = require('./logger');
    const log = create('PrettyTrace').withContext({ correlationId: 'pretty-cid' });
    log.info('traced pretty message');

    process.stdout.write = orig;
    assert.ok(lines[0].includes('[cid:pretty-cid]'), 'pretty output should include cid label');
    assert.ok(lines[0].includes('traced pretty message'));
  });
});
