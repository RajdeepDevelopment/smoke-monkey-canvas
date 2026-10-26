import React from 'react';

export const AnalogClockFace: React.FC<{ hour: number; minute: number }> = ({ hour, minute }) => {
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  const minuteAngle = minute * 6;

  return (
    <div style={{ position: 'relative', width: 92, height: 92, flexShrink: 0 }}>
      <svg width="92" height="92" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="56" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="49" fill="transparent" stroke="hsl(var(--border) / 0.5)" strokeWidth="1" strokeDasharray="2 3" />

        {/* 12 Hour Ticks */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
          const isMajor = i % 3 === 0;
          return (
            <line
              key={deg}
              x1="60"
              y1={isMajor ? '11' : '13'}
              x2="60"
              y2="18"
              stroke={isMajor ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground) / 0.5)'}
              strokeWidth={isMajor ? '2.5' : '1.2'}
              transform={`rotate(${deg} 60 60)`}
            />
          );
        })}

        {/* Markers 12, 3, 6, 9 */}
        <text x="60" y="29" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="hsl(var(--foreground))">12</text>
        <text x="96" y="63.5" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="hsl(var(--foreground))">3</text>
        <text x="60" y="99" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="hsl(var(--foreground))">6</text>
        <text x="24" y="63.5" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="hsl(var(--foreground))">9</text>

        {/* Hour Hand */}
        <line
          x1="60"
          y1="60"
          x2="60"
          y2="36"
          stroke="hsl(var(--foreground))"
          strokeWidth="3.6"
          strokeLinecap="round"
          transform={`rotate(${hourAngle} 60 60)`}
          style={{ transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />

        {/* Minute Hand */}
        <line
          x1="60"
          y1="60"
          x2="60"
          y2="24"
          stroke="#10b981"
          strokeWidth="2.4"
          strokeLinecap="round"
          transform={`rotate(${minuteAngle} 60 60)`}
          style={{ transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />

        {/* Center Pivot */}
        <circle cx="60" cy="60" r="4.5" fill="#10b981" stroke="hsl(var(--background))" strokeWidth="2" />
      </svg>
    </div>
  );
};
