import React, { useEffect, useState } from 'react';
import { Sparkles, Cpu } from 'lucide-react';

export interface AppLoaderProps {
  isReady: boolean;
  onFinished?: () => void;
}

export const AppLoader: React.FC<AppLoaderProps> = ({ isReady, onFinished }) => {
  const [progress, setProgress] = useState(15);
  const [stage, setStage] = useState('Initializing spatial engine…');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);

  useEffect(() => {
    // Stage simulation while initial network & canvas setup runs
    const t1 = setTimeout(() => {
      setProgress(40);
      setStage('Connecting to local agent daemon (Port 3333)…');
    }, 180);

    const t2 = setTimeout(() => {
      setProgress(75);
      setStage('Hydrating spatial workspace & active agents…');
    }, 450);

    const t3 = setTimeout(() => {
      setProgress(92);
      setStage('Synchronizing MCP tools & skills catalog…');
    }, 700);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      setProgress(100);
      setStage('Workspace Ready');
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 350);

      const destroyTimer = setTimeout(() => {
        setIsDestroyed(true);
        onFinished?.();
        // Also remove any pre-React HTML splash element
        if (typeof window !== 'undefined') {
          const preSplash = document.getElementById('app-preboot-splash');
          if (preSplash) preSplash.remove();
        }
      }, 750);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(destroyTimer);
      };
    }
  }, [isReady, onFinished]);

  if (isDestroyed) return null;

  return (
    <div
      className={`app-premium-loader-overlay ${isFadingOut ? 'fade-out' : ''}`}
      aria-live="polite"
      aria-busy={!isReady}
    >
      <div className="loader-ambient-glow" />
      <div className="loader-ambient-glow-2" />

      <div className="loader-glass-card">
        {/* Luminous Logo Aura */}
        <div className="loader-logo-wrapper">
          <div className="loader-logo-aura" />
          <img
            src="/smoke-monkey-mascot.png"
            alt="Smoke Monkey Canvas"
            className="loader-logo-img"
          />
        </div>

        {/* Brand Header */}
        <div className="loader-badge">
          <Sparkles size={11} className="loader-badge-icon" />
          <span>SPATIAL MULTI-AGENT WORKSPACE</span>
        </div>

        <h1 className="loader-title">Smoke Monkey Canvas</h1>

        {/* Live Progress Bar */}
        <div className="loader-progress-track">
          <div
            className="loader-progress-bar"
            style={{ width: `${progress}%` }}
          />
          <div
            className="loader-progress-shine"
            style={{ left: `${Math.min(progress, 95)}%` }}
          />
        </div>

        {/* Dynamic Status Row */}
        <div className="loader-status-row">
          <span className="loader-status-dot" />
          <span className="loader-status-text">{stage}</span>
          <span className="loader-status-pct">{progress}%</span>
        </div>

        {/* Subtitle Footer */}
        <div className="loader-footer-meta">
          <Cpu size={12} />
          <span>Desktop Native Daemon • Local SQLite Engine</span>
        </div>
      </div>
    </div>
  );
};
