'use client';

import React from 'react';

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle - 90) * (Math.PI / 180);
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function ConfidenceGauge({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  const angle = 180 * clamped;
  const needle = polarToCartesian(80, 80, 50, 180 - angle);

  return (
    <div className="confidence-gauge-shell" aria-label="Composite confidence gauge">
      <svg viewBox="0 0 160 100" className="confidence-gauge-svg" role="img" aria-label={`${label} ${Math.round(clamped * 100)} percent`}>
        <path d={describeArc(80, 80, 56, 180, 360)} className="gauge-track" />
        <path d={describeArc(80, 80, 56, 180, 220)} className="gauge-zone-low" />
        <path d={describeArc(80, 80, 56, 220, 300)} className="gauge-zone-medium" />
        <path d={describeArc(80, 80, 56, 300, 360)} className="gauge-zone-high" />
        <line x1="80" y1="80" x2={needle.x} y2={needle.y} className="gauge-needle" />
        <circle cx="80" cy="80" r="5" className="gauge-hub" />
      </svg>
      <div className="confidence-gauge-meta">
        <span>{label}</span>
        <strong>{Math.round(clamped * 100)}%</strong>
      </div>
    </div>
  );
}