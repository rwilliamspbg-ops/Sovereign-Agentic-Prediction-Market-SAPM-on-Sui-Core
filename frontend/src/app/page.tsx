'use client';

import MarketExperienceBoard from '@/components/markets/MarketExperienceBoard';
import { SimpleAgentInsight } from '@/components/a2ui/AgentInsightButton';

export default function MarketDashboardPage() {
  return (
    <>
      <MarketExperienceBoard />
      <SimpleAgentInsight />
    </>
  );
}
