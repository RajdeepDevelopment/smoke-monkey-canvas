import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Clock, Loader2, Sparkles, X, XCircle, Zap } from 'lucide-react';
import { SpaceService } from './space.service.js';

interface ExploreProgressViewProps {
  sessionId: string;
  companyName: string;
  onComplete: (report: any) => void;
  onFailed: () => void;
  onClose: () => void;
}

type StepStatus = 'pending' | 'active' | 'done';

interface ProgressStep {
  label: string;
  detail: string;
  status: StepStatus;
}

const INITIAL_STEPS: ProgressStep[] = [
  { label: 'Ingesting Brief & Files', detail: 'Parsing project markdown, requirements & attached docs', status: 'active' },
  { label: 'Analyzing Codebase & Repos', detail: 'Scanning directories, entry points, and dependencies', status: 'pending' },
  { label: 'Cataloging Features & Modules', detail: 'Mapping boundaries and identifying dedicated feature owners', status: 'pending' },
  { label: 'Designing Organization & Zones', detail: 'Architecting executive hierarchy, managers, and leaf roles', status: 'pending' },
  { label: 'Determining Required MCPs', detail: 'Matching tools, services, and runtime prerequisites', status: 'pending' },
  { label: 'Synthesizing Exploration Report', detail: 'Generating master exploration matrix for Phase 2 team build', status: 'pending' },
];

export function ExploreProgressView({
  sessionId,
  companyName,
  onComplete,
  onFailed,
  onClose,
}: ExploreProgressViewProps) {
  const [steps, setSteps] = useState<ProgressStep[]>(INITIAL_STEPS);
  const [status, setStatus] = useState<'exploring' | 'complete' | 'failed'>('exploring');
  const [report, setReport] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Advance steps visually over time
    let currentIdx = 0;
    const progressTimer = setInterval(() => {
      if (currentIdx < INITIAL_STEPS.length - 1) {
        currentIdx++;
        setSteps((prev) =>
          prev.map((s, idx) => ({
            ...s,
            status: idx < currentIdx ? 'done' : idx === currentIdx ? 'active' : 'pending',
          })),
        );
      }
    }, 4500);

    // 2. Poll server for real session completion
    const pollTimer = setInterval(async () => {
      try {
        const session = await SpaceService.getExploreSession(sessionId);
        if (session.status === 'complete' && session.explore_report_json) {
          clearInterval(progressTimer);
          clearInterval(pollTimer);
          setSteps((prev) => prev.map((s) => ({ ...s, status: 'done' as StepStatus })));
          setStatus('complete');
          try {
            const parsed = JSON.parse(session.explore_report_json);
            setReport(parsed);
          } catch {
            const fetched = await SpaceService.getExploreReport(sessionId);
            setReport(fetched);
          }
        } else if (session.status === 'failed') {
          clearInterval(progressTimer);
          clearInterval(pollTimer);
          setStatus('failed');
          setErrorMessage('Explore Agent encountered an error during analysis.');
        }
      } catch (err) {
        console.warn('[ExploreProgress] Poll error:', err);
      }
    }, 2500);

    // 3. Connect WebSocket for immediate real-time notifications
    const cleanupWs = SpaceService.connectWebSocket((msg) => {
      if (msg.type === 'explore_complete' && (msg as any).sessionId === sessionId) {
        clearInterval(progressTimer);
        clearInterval(pollTimer);
        setSteps((prev) => prev.map((s) => ({ ...s, status: 'done' as StepStatus })));
        setStatus('complete');
        if ((msg as any).report) {
          setReport((msg as any).report);
        }
      } else if (msg.type === 'explore_failed' && (msg as any).sessionId === sessionId) {
        clearInterval(progressTimer);
        clearInterval(pollTimer);
        setStatus('failed');
        setErrorMessage((msg as any).error || 'Explore phase failed');
      }
    });

    return () => {
      clearInterval(progressTimer);
      clearInterval(pollTimer);
      cleanupWs();
    };
  }, [sessionId]);

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--bg-primary, #0f1117)',
          border: '1px solid var(--border-primary, #2a2d3e)',
          borderRadius: 16,
          width: '92vw',
          maxWidth: 520,
          padding: 32,
          boxShadow: '0 28px 90px rgba(0,0,0,0.75)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background:
                status === 'failed'
                  ? 'rgba(239,68,68,0.15)'
                  : status === 'complete'
                  ? 'rgba(34,197,94,0.15)'
                  : 'rgba(99,102,241,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${
                status === 'failed'
                  ? 'rgba(239,68,68,0.3)'
                  : status === 'complete'
                  ? 'rgba(34,197,94,0.3)'
                  : 'rgba(99,102,241,0.3)'
              }`,
            }}
          >
            {status === 'failed' ? (
              <XCircle size={26} color="#ef4444" />
            ) : status === 'complete' ? (
              <CheckCircle2 size={26} color="#22c55e" />
            ) : (
              <Loader2 size={26} color="#818cf8" style={{ animation: 'spin 1.2s linear infinite' }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary, #e2e8f0)' }}>
              {status === 'complete'
                ? 'Phase 1: Explore Complete!'
                : status === 'failed'
                ? 'Exploration Encountered an Issue'
                : 'Phase 1: Explore in Progress...'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted, #94a3b8)', marginTop: 2 }}>
              {companyName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted, #94a3b8)',
              padding: 6,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Step List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {steps.map((step, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '8px 12px',
                borderRadius: 8,
                background:
                  step.status === 'active'
                    ? 'rgba(99,102,241,0.08)'
                    : step.status === 'done'
                    ? 'rgba(34,197,94,0.04)'
                    : 'transparent',
              }}
            >
              <div style={{ marginTop: 2 }}>
                {step.status === 'done' ? (
                  <CheckCircle2 size={16} color="#22c55e" />
                ) : step.status === 'active' ? (
                  <Loader2 size={16} color="#818cf8" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Clock size={16} color="#475569" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: step.status === 'active' ? 600 : 500,
                    color:
                      step.status === 'done'
                        ? 'var(--text-secondary, #cbd5e1)'
                        : step.status === 'active'
                        ? '#c7d2fe'
                        : 'var(--text-muted, #64748b)',
                  }}
                >
                  {step.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', marginTop: 1 }}>
                  {step.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        {errorMessage && (
          <div
            style={{
              marginBottom: 20,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid #ef4444',
              color: '#f87171',
              fontSize: 13,
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {status === 'failed' && (
            <button
              type="button"
              onClick={onFailed}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                borderRadius: 8,
                cursor: 'pointer',
                background: 'none',
                border: '1px solid #ef4444',
                color: '#f87171',
                fontWeight: 500,
              }}
            >
              Close
            </button>
          )}

          {status === 'complete' && (
            <button
              type="button"
              onClick={() => onComplete(report)}
              style={{
                padding: '10px 24px',
                fontSize: 14,
                borderRadius: 8,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                color: '#fff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
              }}
            >
              <Sparkles size={16} /> Review Explore Report & Plan Team
            </button>
          )}

          {status === 'exploring' && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-muted, #94a3b8)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Zap size={13} color="#818cf8" />
              Autonomous Explore Agent is scanning project structures...
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
