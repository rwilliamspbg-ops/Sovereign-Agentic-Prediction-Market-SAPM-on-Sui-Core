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

  const trustLevel = getTrustLevel(score);
  const formattedTrustLevel = trustLevel.charAt(0).toUpperCase() + trustLevel.slice(1);
  const ariaLabelText = `Health score ${score} of 100, trust level ${trustLevel}${showTrend ? `, trend ${trend}` : ''}`;

  return (
    <div 
      role="status"
      tabIndex={0}
      aria-label={ariaLabelText}
      className={cn(
        'relative group inline-flex items-center gap-1.5 rounded-full border font-medium transition-all focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none cursor-help',
        getScoreBg(score),
        sizeClasses[size]
      )}
    >
      <span className={getScoreColor(score)} aria-hidden="true">
        {score >= 80 ? '🎯' : score >= 60 ? '✅' : '⚠️'}
      </span>
      <span>{score}</span>
      
      {showTrend && (
        <span
          className={cn(
            'text-xs',
            trend === 'up' && 'text-emerald-400',
            trend === 'down' && 'text-red-400',
            trend === 'stable' && 'text-gray-400'
          )}
          aria-hidden="true"
        >
          {trend === 'up' && '↑'}
          {trend === 'down' && '↓'}
          {trend === 'stable' && '•'}
        </span>
      )}

      <span className="text-xs text-gray-400 hidden sm:inline" aria-hidden="true">
        ({trustLevel.toUpperCase()})
      </span>

      {/* Accessible Tooltip on hover or keyboard focus */}
      <div
        role="tooltip"
        className="hidden group-hover:block group-focus-within:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-xs text-slate-100 bg-slate-900 border border-slate-700 rounded-md shadow-lg whitespace-nowrap pointer-events-none z-10"
      >
        <span className="font-semibold">{formattedTrustLevel} Trust</span> ({score}/100)
        {showTrend && <span className="ml-1 text-slate-400">• Trend: {trend}</span>}
      </div>
    </div>
  );
};
