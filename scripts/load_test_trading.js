#!/usr/bin/env node

'use strict';

const http = require('http');

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

function startMockServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/api/trade') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}/api` });
    });
  });
}

async function requestTrade(baseUrl) {
  const started = Date.now();
  const response = await fetch(`${baseUrl}/trade`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const latency = Date.now() - started;
  return { status: response.status, latency };
}

async function runLoadTest() {
  const requests = Number(process.env.REQUESTS || 100);
  const concurrency = Number(process.env.CONCURRENCY || 10);

  let serverHandle = null;
  let baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    serverHandle = await startMockServer();
    baseUrl = serverHandle.baseUrl;
  }

  const started = Date.now();
  let success = 0;
  let failed = 0;
  const latencies = [];

  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (cursor < requests) {
      const index = cursor;
      cursor += 1;

      try {
        const result = await requestTrade(baseUrl);
        latencies.push(result.latency);
        if (result.status === 200) {
          success += 1;
        } else {
          failed += 1;
          console.error(`Request ${index + 1} failed with status ${result.status}`);
        }
      } catch (error) {
        failed += 1;
        console.error(`Request ${index + 1} failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });

  await Promise.all(workers);

  const durationMs = Date.now() - started;
  const rps = requests / Math.max(1, durationMs / 1000);
  const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const p99Latency = percentile(latencies, 99);

  const report = {
    requests,
    concurrency,
    durationMs,
    success,
    failed,
    successRate: requests > 0 ? (success / requests) * 100 : 0,
    rps,
    avgLatency,
    p99Latency,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(report, null, 2));

  if (process.env.LOAD_REPORT_PATH) {
    require('fs').writeFileSync(process.env.LOAD_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (serverHandle?.server) {
    serverHandle.server.close();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runLoadTest().catch((error) => {
  console.error(error);
  process.exit(1);
});
