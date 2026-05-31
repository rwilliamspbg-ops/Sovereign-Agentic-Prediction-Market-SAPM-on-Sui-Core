/**
 * SAPM Aggregator Metrics Exporter
 * Prometheus-compatible metrics for FL aggregator service
 */

const http = require('http')

// Metrics registry
const metrics = {
  // Aggregation metrics
  aggregatedPredictions: {
    type: 'gauge',
    help: 'Number of predictions aggregated per round'
  },
  aggregationLatencyMs: {
    type: 'histogram',
    help: 'Latency for aggregating predictions in milliseconds',
    buckets: [10, 50, 100, 250, 500, 1000]
  },
  
  // Agent metrics
  activeAgents: {
    type: 'gauge',
    help: 'Number of currently active agents'
  },
  agentReputationAvg: {
    type: 'gauge',
    help: 'Average reputation score across all agents (0-1)'
  },
  
  // Market metrics
  marketCoverageCount: {
    type: 'gauge',
    help: 'Number of markets with available forecasts'
  },
  marketParticipationRate: {
    type: 'gauge',
    help: 'Percentage of agents participating in active markets'
  },
  
  // Error metrics
  aggregationErrors: {
    type: 'counter',
    help: 'Total number of aggregation errors',
    labelNames: ['error_type']
  }
}

// Initialize metrics with default values
Object.keys(metrics).forEach(key => {
  const metric = metrics[key]
  
  if (metric.type === 'counter') {
    metrics[key].value = () => 0
    metrics[key].labels = {}
  } else if (metric.type === 'histogram') {
    metrics[key].observations = []
    metrics[key].sum = 0
    metrics[key].count = 0
  } else {
    metrics[key].value = () => 0
  }
})

// Metrics HTTP server
const metricsPort = process.env.METRICS_PORT || 9090
let requestCount = 0

const server = http.createServer((req, res) => {
  if (req.url === '/metrics') {
    requestCount++
    const timestamp = Date.now() / 1000
    
    // Generate Prometheus-format metrics
    let output = `# HELP sapm_aggregated_predictions Number of predictions aggregated per round\n`
    output += `# TYPE sapm_aggregated_predictions gauge\n`
    output += `sapm_aggregated_predictions ${metrics.aggregatedPredictions.value()}  # updated_at=${timestamp.toFixed(3)}\n`
    
    output += `\n# HELP sapm_agent_count Number of currently active agents\n`
    output += `# TYPE sapm_agent_count gauge\n`
    output += `sapm_agent_count {status="active"} ${metrics.activeAgents.value()}  # updated_at=${timestamp.toFixed(3)}\n`
    
    output += `\n# HELP sapm_agent_reputation_avg Average reputation score across all agents\n`
    output += `# TYPE sapm_agent_reputation_avg gauge\n`
    output += `sapm_agent_reputation_avg ${metrics.agentReputationAvg.value().toFixed(4)}  # updated_at=${timestamp.toFixed(3)}\n`
    
    // Histogram metrics
    if (metrics.aggregationLatencyMs.count > 0) {
      const avg = metrics.aggregationLatencyMs.sum / metrics.aggregationLatencyMs.count
      output += `\n# HELP sapm_aggregation_latency_ms Aggregation latency histogram\n`
      output += `# TYPE sapm_aggregation_latency_ms histogram\n`
      output += `sapm_aggregation_latency_ms_sum {quantile="0.5"} ${metrics.aggregationLatencyMs.sum / 2}  # updated_at=${timestamp.toFixed(3)}\n`
      output += `sapm_aggregation_latency_ms_count {quantile="1.0"} ${metrics.aggregationLatencyMs.count}  # updated_at=${timestamp.toFixed(3)}\n`
    }
    
    // Error metrics
    Object.keys(metrics.aggregationErrors.labels).forEach(label => {
      const errorCount = metrics.aggregationErrors.value().get?.([label]) || 0
      if (errorCount > 0) {
        output += `\n# HELP sapm_aggregation_errors Aggregation errors counter\n`
        output += `# TYPE sapm_aggregation_errors counter\n`
        output += `sapm_aggregation_errors{error_type="${label}"} ${errorCount}  # updated_at=${timestamp.toFixed(3)}\n`
      }
    })

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(output)
    
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: Date.now(),
      requestCount
    }))
    
  } else {
    res.writeHead(404)
    res.end('Not Found')
  }
})

server.listen(metricsPort, () => {
  console.log(`[Metrics] Prometheus metrics server listening on port ${metricsPort}`)
  console.log(`[Metrics] Health check endpoint: http://localhost:${metricsPort}/health`)
  console.log(`[Metrics] Metrics endpoint: http://localhost:${metricsPort}/metrics`)
})

// Expose metrics object for programmatic updates
module.exports = { metrics, server }
