import React, { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';

let isInitialized = false;

function initMermaid() {
  if (isInitialized) return;
  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      themeVariables: {
        darkMode: true,
        background: '#0d1322',
        primaryColor: '#38bdf8',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#0284c7',
        lineColor: '#94a3b8',
        secondaryColor: '#818cf8',
        tertiaryColor: '#1e293b',
      },
    });
    isInitialized = true;
  } catch (err) {
    console.warn('[initMermaid] Failed to initialize:', err);
  }
}

export interface MermaidDiagramProps {
  code: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ code }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const rawId = useId();
  const diagramId = `mmd_${rawId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Math.random().toString(36).slice(2, 6)}`;

  useEffect(() => {
    initMermaid();
    let isMounted = true;
    const cleanCode = code ? code.trim() : '';
    if (!cleanCode) {
      setSvg('');
      setError(null);
      return;
    }

    mermaid
      .render(diagramId, cleanCode)
      .then((res) => {
        if (isMounted) {
          setSvg(res.svg);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Mermaid diagram could not be rendered');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [code, diagramId]);

  if (error) {
    return (
      <div
        style={{
          margin: '12px 0',
          padding: 12,
          borderRadius: 8,
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.28)',
          color: '#fca5a5',
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontWeight: 600 }}>⚠️ Mermaid Diagram Render Warning</span>
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            style={{
              padding: '2px 8px',
              fontSize: 11,
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: 4,
              color: '#e2e8f0',
              cursor: 'pointer',
            }}
          >
            {showCode ? 'Hide Code' : 'View Code'}
          </button>
        </div>
        <div style={{ opacity: 0.85, fontSize: 11 }}>{error}</div>
        {showCode && (
          <pre
            style={{
              marginTop: 8,
              padding: 10,
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: 6,
              fontSize: 11,
              overflowX: 'auto',
              color: '#cbd5e1',
            }}
          >
            {code}
          </pre>
        )}
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        style={{
          margin: '12px 0',
          padding: 16,
          textAlign: 'center',
          color: '#64748b',
          fontSize: 12,
          background: 'rgba(15, 23, 42, 0.5)',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        Rendering Mermaid diagram...
      </div>
    );
  }

  return (
    <div
      style={{
        margin: '14px 0',
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        background: 'radial-gradient(ellipse at top, rgba(14, 23, 42, 0.95), rgba(7, 10, 19, 0.98))',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: 11,
          color: '#94a3b8',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8' }} />
          Mermaid Diagram
        </span>
        <button
          type="button"
          onClick={() => setShowCode(!showCode)}
          style={{
            padding: '2px 8px',
            fontSize: 11,
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 4,
            color: '#94a3b8',
            cursor: 'pointer',
          }}
        >
          {showCode ? 'Hide Source' : 'View Source'}
        </button>
      </div>

      <div
        style={{
          overflowX: 'auto',
          padding: '16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 120,
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      {showCode && (
        <pre
          style={{
            margin: 0,
            padding: 12,
            background: 'rgba(0, 0, 0, 0.5)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: 11,
            color: '#cbd5e1',
            overflowX: 'auto',
          }}
        >
          {code}
        </pre>
      )}
    </div>
  );
};
