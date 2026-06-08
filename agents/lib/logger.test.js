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
});
