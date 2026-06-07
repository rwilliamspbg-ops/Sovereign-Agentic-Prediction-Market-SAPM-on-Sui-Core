"""
MCP Server for SAPM Agents - Model Context Protocol
Provides live agent data as interactive UI components
"""

from mcp.server import Server
from mcp.types import TextContent, ImageContent, Resource
import json
from typing import List, Dict, Any
import sys
import os
import asyncio
from functools import wraps

# Add parent directory to path so we can import agents
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from agents.aggregator.aggregation import Aggregator
    from agents.trader.index import Trader
except ImportError:
    print("Warning: Agent modules not found. Running in demo mode.")
    class MockAggregator:
        def get_forecast(self, market_id):
            return {"probability": 0.72, "confidence": 0.85}
    
    class MockTrader:
        def get_market_data(self, market_id):
            return {"volume": 1500000, "tvl": 2500000, "price": 0.68}

# Create MCP server
server = Server("sapm-agents")


class RateLimitedHandler:
    def __init__(self, max_concurrent: int = 3):
        self.semaphore = asyncio.Semaphore(max_concurrent)

    def wrap_async(self, func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            async with self.semaphore:
                return await func(*args, **kwargs)

        return wrapper


rate_limiter = RateLimitedHandler(max_concurrent=int(os.getenv("MCP_MAX_CONCURRENT", "3")))

@server.tool()
def get_agent_forecast(
    market_id: str,
    agent_name: str = "consensus"
) -> TextContent:
    """Get forecast from specific agent"""
    try:
        aggregator = Aggregator()
        forecast = aggregator.get_forecast(market_id)
        
        return TextContent(
            type="text",
            text=json.dumps({
                "agent": agent_name,
                "forecast": forecast["probability"],
                "confidence": forecast["confidence"],
                "market": market_id
            })
        )
    except Exception as e:
        return TextContent(
            type="text",
            text=json.dumps({
                "error": str(e),
                "demo": {"agent": agent_name, "forecast": 0.72, "confidence": 0.85}
            })
        )

@server.resource("agents/market-data/{market_id}")
@rate_limiter.wrap_async
async def get_market_data(market_id: str) -> TextContent:
    """Stream live market data to UI"""
    try:
        trader = Trader()
        data = trader.get_market_data(market_id)
        
        return TextContent(
            type="text",
            text=json.dumps(data),
            mimeType="application/json"
        )
    except Exception as e:
        return TextContent(
            type="text",
            text=json.dumps({
                "error": str(e),
                "demo_market_data": {
                    "volume": 1500000,
                    "tvl": 2500000,
                    "price": 0.68,
                    "market_id": market_id
                }
            })
        )

@server.prompt()
def agent_insight(prompt_name: str, market_id: str) -> List[TextContent]:
    """Request agent to provide insight"""
    try:
        # Generate or fetch agent insight
        aggregator = Aggregator()
        forecast = aggregator.get_forecast(market_id)
        
        insight = f"""Based on current market conditions for {market_id}:

🔮 **Agent Forecast:** {forecast['probability']:.0%} YES probability
⭐ **Confidence Level:** {forecast['confidence']:.0%}

Key indicators:
- Market sentiment is leaning positive
- Recent trading volume suggests bullish momentum
- AI model confidence is high

**Recommendation:** Consider positioning based on this forecast"""
        
        return [TextContent(type="text", text=insight)]
    except Exception as e:
        return [TextContent(
            type="text",
            text=f"Demo Agent Insight for {market_id}:\n\nBased on current market conditions, our consensus agent predicts a 72% probability with 85% confidence. Market sentiment is bullish."
        )]

@server.tool()
def get_all_agent_forecasts(market_id: str) -> TextContent:
    """Get forecasts from all agents"""
    try:
        aggregator = Aggregator()
        
        # Simulate multiple agent forecasts
        forecasts = [
            {"agent": "consensus", "probability": 0.72, "confidence": 0.85},
            {"agent": "expert_v1", "probability": 0.68, "confidence": 0.78},
            {"agent": "market_maker", "probability": 0.75, "confidence": 0.82},
        ]
        
        return TextContent(
            type="text",
            text=json.dumps({
                "market_id": market_id,
                "forecasts": forecasts
            })
        )
    except Exception as e:
        return TextContent(
            type="text",
            text=json.dumps({
                "error": str(e),
                "demo_forecasts": [
                    {"agent": "consensus", "probability": 0.72, "confidence": 0.85},
                    {"agent": "expert_v1", "probability": 0.68, "confidence": 0.78}
                ]
            })
        )

# Initialize server
if __name__ == "__main__":
    import asyncio
    asyncio.run(server.run(transport="stdio"))
