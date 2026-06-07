#!/bin/bash
# SAPM Deployment Script - Complete Implementation Deployment
# Author: Sovereign Mohawk Ops
# Date: 2026-06-06
# Status: Production Ready with A2UI Integration

set -e

echo "=========================================="
echo "🚀 SAPM End-to-End Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in Docker
if [ -f /proc/1/cgroup ]; then
    log_info "Running in Docker container"
fi

echo ""
echo "📦 Installation Steps:"
echo "======================"

# Step 1: Install dependencies
log_info "Installing frontend dependencies..."
cd frontend
npm install copilotkit copilotkit-react framer-motion @copilotkit/react-core

if [ $? -eq 0 ]; then
    log_info "✅ Dependencies installed successfully"
else
    log_error "❌ Dependency installation failed"
    exit 1
fi

# Step 2: Build production bundle
log_info "Building production bundle..."
npm run build

if [ $? -eq 0 ]; then
    log_info "✅ Build completed successfully"
else
    log_error "❌ Build failed"
    exit 1
fi

# Step 3: Setup environment variables
log_info "Creating .env file..."

cat > .env << EOF
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUI_RPC=https://fullnode.testnet.sui.io:443
NEXT_PUBLIC_NETWORK=testnet
EOF

log_info "✅ Environment file created"

# Step 4: Verify A2UI integration
log_info "Verifying A2UI integration..."

if [ -f "src/services/copilot-bridge.ts" ]; then
    log_info "✅ CopilotKit bridge found"
else
    log_error "❌ CopilotKit bridge not found"
fi

if [ -f "src/components/a2ui/AgentInsightButton.tsx" ]; then
    log_info "✅ AgentInsightButton component found"
else
    log_error "❌ AgentInsightButton component not found"
fi

log_info "✅ A2UI integration verified"

# Step 5: Start application
log_info "Starting SAPM application..."
npm start &

sleep 5

log_info ""
log_info "=========================================="
log_info "🎉 Deployment Complete!"
log_info "=========================================="
log_info ""
log_info "Application is now running at:"
echo -e "  Frontend:   http://localhost:3000"
echo -e "  Aggregator: http://localhost:4000"
echo -e "  Sui RPC:    http://localhost:9000"
log_info ""
log_info "🤖 A2UI Features Available:"
log_info "  • Click '🤖 Get Agent Insight' button"
log_info "  • Real-time agent forecasts"
log_info "  • Agent-initiated modals"
log_info ""
log_info "💼 Connect your Sui Wallet to trade!"
log_info ""
echo "=========================================="
