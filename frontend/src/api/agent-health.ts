import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const agentId = url.searchParams.get('agentId');

    if (agentId) {
      // Fetch specific agent health
      const healthData = await fetchAgentHealth(agentId);
      return NextResponse.json(healthData);
    } else {
      // Fetch all agents health
      const healthData = await fetchAllAgentHealth();
      return NextResponse.json(healthData);
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch agent health' },
      { status: 500 }
    );
  }
}

async function fetchAgentHealth(agentId: string): Promise<any> {
  // Fetch from on-chain oracle or backend service
  // This would integrate with your SAPM smart contracts
  const response = await fetch(`http://localhost:3001/api/agents/${agentId}/health`);
  return response.json();
}

async function fetchAllAgentHealth(): Promise<any> {
  // Fetch all agents health for dashboard
  const response = await fetch('http://localhost:3001/api/agents/health');
  return response.json();
}
