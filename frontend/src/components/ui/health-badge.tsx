import React from 'react';
import { cn } from '@/lib/utils';

interface HealthBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  trend?: 'up' | 'down' | 'stable';
}

export const HealthBadge: React.FC<HealthBadgeProps> = ({ 
  score, 
  size = 'md', 
  showTrend = false,
  trend = 'stable'
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 75) return 'text-teal-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/10 border-emerald-500/20';
    if (score >= 75) return 'bg-teal-500/10 border-teal-500/20';
    if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-red-500/10 border-red-500/20';
  };

  const getTrustLevel = (score: number) => {
    if (score >= 90) return 'high';
    if (score >= 70) return 'medium';
    return 'low';
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium transition-all',
        getScoreBg(score),
        sizeClasses[size]
      )}
    >
      <span className={getScoreColor(score)}>
        {score >= 80 ? '🎯' : score >= 60 ? '✅' : '⚠️'}
      </span>
      <span>{score}</span>
      
      {showTrend && (
        <span className={cn(
          'text-xs',
          trend === 'up' && 'text-emerald-400',
          trend === 'down' && 'text-red-400',
          trend === 'stable' && 'text-gray-400'
        )}>
          {trend === 'up' && '↑'}
          {trend === 'down' && '↓'}
          {trend === 'stable' && '•'}
        </span>
      )}

      <span className="text-xs text-gray-400 hidden sm:inline">
        ({getTrustLevel(score).toUpperCase()})
      </span>
    </div>
  );
};
