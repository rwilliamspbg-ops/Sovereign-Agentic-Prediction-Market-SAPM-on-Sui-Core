/**
 * AI Forecast Reasoner
 * 
 * LLM-powered forecast analysis with confidence scoring and explainability.
 * Integrates with Anthropic Claude / OpenAI o1 models for market predictions.
 * 
 * @module ai-agents/reasoning/forecast-reasoner
 * @version 1.0.0
 */

const EventEmitter = require('events');

/**
 * Configuration for LLM API integration
 */
const Config = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  DEFAULT_MODEL: process.env.DEFAULT_LLM_MODEL || 'claude-3-5-sonnet',
  MAX_TOKENS: 2048,
  TEMPERATURE: 0.7,
  RATE_LIMIT: {
    requestsPerMinute: 60,
    burstSize: 10
  }
};

/**
 * Forecast Analysis Result
 */
class ForecastAnalysis {
  constructor(marketId, analysis) {
    this.marketId = marketId;
    this.timestamp = new Date().toISOString();
    this.confidence = analysis.confidence || 0;
    this.prediction = analysis.prediction || null;
    this.edge = analysis.edge || null;
    this.riskMetrics = analysis.riskMetrics || {};
    this.explanation = analysis.explanation || '';
    this.supportingFactors = analysis.supportingFactors || [];
    this.disclaimer = analysis.disclaimer || '';
  }

  toJSON() {
    return {
      marketId: this.marketId,
      timestamp: this.timestamp,
      confidence: this.confidence,
      prediction: this.prediction,
      edge: this.edge,
      riskMetrics: this.riskMetrics,
      explanation: this.explanation,
      supportingFactors: this.supportingFactors
    };
  }
}

/**
 * LLM Forecast Reasoner - Main AI reasoning engine
 */
class ForecastReasoner extends EventEmitter {
  /**
   * Initialize forecast reasoner
   * @param {Object} config - Configuration options
   * @param {string} [config.model] - LLM model to use
   * @param {number} [config.maxTokens] - Max tokens per response
   */
  constructor(config = {}) {
    super();
    
    this.model = config.model || Config.DEFAULT_MODEL;
    this.maxTokens = config.maxTokens || Config.MAX_TOKENS;
    this.temperature = Config.TEMPERATURE;
    
    // Rate limiting
    this.rateLimiter = new RateLimiter(Config.RATE_LIMIT);
    this.requestQueue = [];
    this.isProcessing = false;
    
    // Memory for historical accuracy tracking
    this.forecastHistory = new Map(); // marketId -> array of past forecasts
    
    console.log(`[ForecastReasoner] Initialized with model: ${this.model}`);
  }

  /**
   * Analyze market forecast using LLM
   * @param {string} marketId - Market identifier
   * @param {Object} context - Market context (order book, news, etc.)
   * @returns {Promise<ForecastAnalysis>} Forecast analysis result
   */
  async analyzeMarket(marketId, context) {
    await this.rateLimiter.acquire();
    
    try {
      console.log(`[ForecastReasoner] Analyzing market: ${marketId}`);
      
      // Prepare prompt with market context
      const prompt = this._prepareAnalysisPrompt(marketId, context);
      
      // Call LLM API
      const response = await this._callLLM(prompt, marketId);
      
      // Parse and score the response
      const analysis = this._parseAndScoreResponse(response, marketId);
      
      // Store in history for accuracy tracking
      this._updateForecastHistory(marketId, analysis);
      
      // Emit completion event
      this.emit('analysis_complete', {
        marketId,
        analysis: analysis.toJSON()
      });
      
      return analysis;
      
    } catch (error) {
      console.error(`[ForecastReasoner] Analysis failed for ${marketId}:`, error.message);
      
      // Emit error event
      this.emit('analysis_error', {
        marketId,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Prepare analysis prompt with market context
   * @param {string} marketId - Market identifier
   * @param {Object} context - Market context data
   * @returns {string} Formatted prompt
   */
  _prepareAnalysisPrompt(marketId, context) {
    const { orderBook, yesPrice, noPrice } = context;
    
    const prompt = `
You are an expert prediction market analyst. Analyze this market:

MARKET ID: ${marketId}
CURRENT PRICES: YES=${yesPrice || 'N/A'}, NO=${noPrice || 'N/A'}

ORDER BOOK ANALYSIS:
Yes Bids: ${(orderBook?.yesBids?.length || 0)} levels
Yes Asks: ${(orderBook?.yesAsks?.length || 0)} levels  
No Bids: ${(orderBook?.noBids?.length || 0)} levels
No Asks: ${(orderBook?.noAsks?.length || 0)} levels

TASK:
1. Analyze the implied probabilities and market sentiment
2. Identify key factors influencing this market (historical trends, news, technical indicators)
3. Provide a forecast with confidence score (0-100%)
4. Explain your reasoning clearly
5. List supporting factors for your prediction

CONSTRAINTS:
- Base your analysis on available order book data and general knowledge
- Be honest about uncertainty
- Consider market manipulation risks
`;

    return prompt;
  }

  /**
   * Call LLM API with rate limiting
   * @param {string} prompt - Analysis prompt
   * @param {string} marketId - Market identifier for logging
   * @returns {Promise<string>} LLM response text
   */
  async _callLLM(prompt, marketId) {
    let model = this.model;
    
    if (Config.ANTHROPIC_API_KEY) {
      model = 'anthropic/claude-3-5-sonnet';
    } else if (Config.OPENAI_API_KEY) {
      model = 'openai/o1-mini';
    }

    console.log(`[ForecastReasoner] Calling ${model} for market: ${marketId}`);
    
    // Use AI SDK or direct API call based on available credentials
    try {
      const response = await this._invokeLLMModel(model, prompt);
      return response;
      
    } catch (error) {
      throw new Error(`LLM API error for ${marketId}: ${error.message}`);
    }
  }

  /**
   * Invoke LLM model (placeholder - implement based on chosen provider)
   * @param {string} model - Model identifier
   * @param {string} prompt - Prompt text
   * @returns {Promise<string>} Model response
   */
  async _invokeLLMModel(model, prompt) {
    // This would integrate with Anthropic or OpenAI SDK
    // For now, return a simulated response for testing
    
    console.log(`[ForecastReasoner] [${model}] Processing prompt...`);
    
    // Simulate API call (remove in production)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return `Analysis for market ${prompt.split('MARKET ID:')[1]?.split('\n')[0]}:\n\nBased on the order book analysis showing balanced liquidity on both sides, I forecast a roughly even outcome with moderate confidence. The implied probabilities suggest efficient pricing around 50/50.\n\nKey factors influencing this market include historical precedent and current market sentiment.\n\nConfidence: 65%\nPrediction: Near 50/50 split`;
  }

  /**
   * Parse and score LLM response
   * @param {string} response - Raw LLM response
   * @param {string} marketId - Market identifier
   * @returns {Object} Analysis result object
   */
  _parseAndScoreResponse(response, marketId) {
    // Extract confidence from response (or estimate based on analysis quality)
    const confidenceMatch = response.match(/confidence[:\s]+(\d+)/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : this.estimateConfidenceFromResponse(response);
    
    // Extract prediction/outcome
    const predictionMatch = response.match(/forecast[:\s]+(.*?)$/im);
    const prediction = predictionMatch ? predictionMatch[1].trim() : 'neutral';
    
    // Calculate market edge (difference between forecast and implied probability)
    const impliedYes = 50; // Simplified - would use actual order book data
    const impliedNo = 50;
    
    return {
      confidence,
      prediction,
      edge: Math.abs(confidence - 50), // Simplified edge calculation
      riskMetrics: {
        volatility: 'medium',
        liquidity: 'high',
        manipulationRisk: 'low'
      },
      explanation: response.substring(0, 500) + '...', // Truncate for storage
      supportingFactors: this._extractSupportingFactors(response),
      disclaimer: 'AI-generated forecast. Verify with multiple sources before trading.'
    };
  }

  /**
   * Estimate confidence based on response quality (fallback when no explicit confidence provided)
   * @param {string} response - LLM response text
   * @returns {number} Estimated confidence score (0-100)
   */
  estimateConfidenceFromResponse(response) {
    const lower = response.toLowerCase();
    
    // Higher confidence for more specific predictions
    let confidence = 50; // Base confidence
    
    if (lower.includes('very confident') || lower.includes('highly certain')) {
      confidence += 20;
    } else if (lower.includes('confident') || lower.includes('certain')) {
      confidence += 10;
    } else if (lower.includes('uncertain') || lower.includes('cautious')) {
      confidence -= 10;
    } else if (lower.includes('unlikely') || lower.includes('risky')) {
      confidence -= 5;
    }
    
    return Math.min(Math.max(confidence, 20), 90); // Clamp to [20, 90]
  }

  /**
   * Extract supporting factors from LLM response
   * @param {string} response - LLM response text
   * @returns {Array} Array of supporting factor strings
   */
  _extractSupportingFactors(response) {
    const factors = [];
    
    // Look for bullet points or numbered lists in response
    const factorMatches = response.match(/-[\s\S]+?$/gm);
    
    if (factorMatches) {
      factors.push(...factorMatches.slice(0, 3)); // Top 3 factors
    } else {
      // Fallback: extract key phrases
      const phrases = response.split('\n').filter(line => 
        line.trim().length > 20 && !line.startsWith('##')
      ).slice(0, 3);
      
      factors.push(...phrases);
    }
    
    return factors;
  }

  /**
   * Update forecast history for accuracy tracking
   * @param {string} marketId - Market identifier
   * @param {Object} analysis - Analysis result
   */
  _updateForecastHistory(marketId, analysis) {
    if (!this.forecastHistory.has(marketId)) {
      this.forecastHistory.set(marketId, []);
    }

    const history = this.forecastHistory.get(marketId);
    history.push({
      timestamp: new Date().toISOString(),
      confidence: analysis.confidence,
      prediction: analysis.prediction,
      outcome: null // Will be updated when market resolves
    });

    // Keep last 50 forecasts per market
    if (history.length > 50) {
      history.shift();
    }
  }

  /**
   * Update forecast accuracy when market resolves
   * @param {string} marketId - Market identifier
   * @param {Object} resolution - Resolution data
   */
  updateAccuracy(marketId, resolution) {
    const history = this.forecastHistory.get(marketId);
    
    if (!history || history.length === 0) {
      console.log(`[ForecastReasoner] No history found for ${marketId}`);
      return;
    }

    // Mark most recent forecast with outcome
    const latestForecast = history[history.length - 1];
    latestForecast.outcome = resolution.outcome;
    latestForecast.actualConfidence = resolution.confidence || null;

    console.log(`[ForecastReasoner] Updated accuracy for ${marketId}: predicted ${latestForecast.prediction}, actual ${resolution.outcome}`);
    
    // Recalculate rolling accuracy
    this._recalculateAccuracy(marketId);
  }

  /**
   * Recalculate accuracy metrics for a market
   * @param {string} marketId - Market identifier
   */
  _recalculateAccuracy(marketId) {
    const history = this.forecastHistory.get(marketId);
    
    if (!history || history.length < 5) {
      return; // Need minimum forecasts for meaningful stats
    }

    // Count correct predictions
    const correctPredictions = history.filter(f => f.outcome && f.prediction === f.outcome).length;
    const accuracy = (correctPredictions / history.length) * 100;

    console.log(`[ForecastReasoner] Accuracy for ${marketId}: ${(accuracy).toFixed(1)}% (${correctPredictions}/${history.length})`);
    
    // Store accuracy metric
    this._setAccuracyMetric(marketId, {
      accuracy,
      totalForecasts: history.length,
      correctPredictions
    });
  }

  /**
   * Set accuracy metric for market (used by external systems)
   * @param {string} marketId - Market identifier  
   * @param {Object} metrics - Accuracy metrics object
   */
  _setAccuracyMetric(marketId, metrics) {
    this._setAccuracyMetricForMarket(marketId, metrics);
  }

  /**
   * Get accuracy metrics for a market
   * @param {string} marketId - Market identifier
   * @returns {Object|null} Accuracy metrics or null if insufficient data
   */
  getAccuracyMetrics(marketId) {
    const history = this.forecastHistory.get(marketId);
    
    if (!history || history.length < 5) {
      return null;
    }

    // Calculate accuracy
    const correctPredictions = history.filter(f => f.outcome && f.prediction === f.outcome).length;
    const accuracy = (correctPredictions / history.length) * 100;

    return {
      marketId,
      accuracy,
      totalForecasts: history.length,
      correctPredictions,
      averageConfidence: this._calculateAverageConfidence(marketId),
      confidenceCalibration: this._estimateConfidenceCalibration(marketId)
    };
  }

  /**
   * Calculate average confidence across all forecasts
   * @param {string} marketId - Market identifier
   * @returns {number|null} Average confidence or null
   */
  _calculateAverageConfidence(marketId) {
    const history = this.forecastHistory.get(marketId);
    
    if (!history || history.length === 0) {
      return null;
    }

    const confidences = history.filter(f => f.confidence).map(f => f.confidence);
    const avg = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    
    return avg.toFixed(1);
  }

  /**
   * Estimate confidence calibration (how accurate are the confidence scores?)
   * @param {string} marketId - Market identifier
   * @returns {number|null} Calibration metric or null
   */
  _estimateConfidenceCalibration(marketId) {
    const history = this.forecastHistory.get(marketId);
    
    if (!history || history.length < 5) {
      return null;
    }

    // Simple calibration: compare predicted confidence vs actual accuracy for high-confidence forecasts
    const highConfidenceForecasts = history.filter(f => f.confidence && f.confidence > 70 && f.outcome);
    
    if (highConfidenceForecasts.length < 3) {
      return null;
    }

    // Count how many high-confidence predictions were correct
    const correctHighConfidence = highConfidenceForecasts.filter(f => f.prediction === f.outcome).length;
    const calibration = (correctHighConfidence / highConfidenceForecasts.length) * 100;

    return calibration.toFixed(1);
  }

  /**
   * Reset reasoner state
   */
  reset() {
    this.forecastHistory.clear();
    this.requestQueue = [];
    console.log('[ForecastReasoner] State reset');
  }
}

/**
 * Rate Limiter for API calls
 */
class RateLimiter {
  /**
   * Initialize rate limiter
   * @param {Object} config - Rate limit configuration
   */
  constructor(config) {
    this.requestsPerMinute = config.requestsPerMinute || 60;
    this.burstSize = config.burstSize || 10;
    this.tokens = this.burstSize;
    this.lastUpdateTime = Date.now();
    
    // Token bucket algorithm
    this._refillRate = (this.requestsPerMinute / 60) * 1000; // tokens per ms
  }

  /**
   * Acquire a token (waits if necessary)
   * @returns {Promise} Promise that resolves when token is available
   */
  async acquire() {
    const now = Date.now();
    
    // Refill tokens based on time elapsed
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    const tokensToAdd = (timeSinceLastUpdate / 1000) * this._refillRate;
    
    this.tokens = Math.min(this.burstSize, this.tokens + tokensToAdd);
    this.lastUpdateTime = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return Promise.resolve();
    } else {
      // Wait for next token to be available
      const timeUntilNextToken = (1 - this.tokens) / this._refillRate * 1000;
      return new Promise(resolve => setTimeout(resolve, timeUntilNextToken));
    }
  }
}

/**
 * Module exports
 */
module.exports = { 
  ForecastReasoner, 
  ForecastAnalysis,
  Config
};
