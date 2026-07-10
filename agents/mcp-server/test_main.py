import json
import pytest
from unittest.mock import MagicMock, patch

import sys
import os
# Ensure agents/mcp-server is in Python path so we can import main
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import main

def test_get_agent_forecast_happy_path_demo():
    """Test get_agent_forecast using default MockAggregator (demo mode)."""
    # Call the tool directly
    response = main.get_agent_forecast(market_id="test-market", agent_name="test-agent")

    assert response.type == "text"
    data = json.loads(response.text)

    assert data["agent"] == "test-agent"
    assert data["market"] == "test-market"
    assert data["forecast"] == 0.72
    assert data["confidence"] == 0.85

def test_get_agent_forecast_custom_aggregator():
    """Test get_agent_forecast when the Aggregator is patched with custom values."""
    mock_aggregator_instance = MagicMock()
    mock_aggregator_instance.get_forecast.return_value = {
        "probability": 0.45,
        "confidence": 0.90
    }

    with patch("main.Aggregator", return_value=mock_aggregator_instance) as mock_class:
        response = main.get_agent_forecast(market_id="custom-market", agent_name="expert-agent")

        mock_class.assert_called_once()
        mock_aggregator_instance.get_forecast.assert_called_once_with("custom-market")

        assert response.type == "text"
        data = json.loads(response.text)
        assert data["agent"] == "expert-agent"
        assert data["market"] == "custom-market"
        assert data["forecast"] == 0.45
        assert data["confidence"] == 0.90

def test_get_agent_forecast_exception_fallback():
    """Test get_agent_forecast when an exception is raised by the Aggregator."""
    mock_aggregator_instance = MagicMock()
    mock_aggregator_instance.get_forecast.side_effect = Exception("Aggregator failed!")

    with patch("main.Aggregator", return_value=mock_aggregator_instance):
        response = main.get_agent_forecast(market_id="error-market", agent_name="error-agent")

        assert response.type == "text"
        data = json.loads(response.text)

        # Should catch the error and fallback to demo payload
        assert "error" in data
        assert "Aggregator failed!" in data["error"]
        assert data["demo"]["agent"] == "error-agent"
        assert data["demo"]["forecast"] == 0.72
        assert data["demo"]["confidence"] == 0.85
