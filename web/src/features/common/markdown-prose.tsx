import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidDiagram } from '../agent/mermaid-diagram.js';

export interface MarkdownProseProps {
  children: string;
  /** Resolves relative image paths inside the document (e.g. workspace files). */
  resolveImageUrl?: (src: string) => string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Shared rich Markdown renderer for document viewers (agent assets, file
 * explorer, side decks). Parses GFM (tables, strikethrough, task lists) and
 * styles every block so headings, lists and tables read properly on the dark
 * canvas themes — bare <ReactMarkdown/> drops all of it unstyled.
 */
export function MarkdownProse({ children, resolveImageUrl, className, style }: MarkdownProseProps) {
  return (
    <div className={className} style={style}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1 {...props} style={{ fontSize: '1.4em', fontWeight: 700, margin: '1em 0 0.5em', color: '#ffffff' }} />
          ),
          h2: (props) => (
            <h2 {...props} style={{ fontSize: '1.2em', fontWeight: 700, margin: '1em 0 0.45em', color: '#ffffff' }} />
          ),
          h3: (props) => (
            <h3 {...props} style={{ fontSize: '1.08em', fontWeight: 650, margin: '0.9em 0 0.4em', color: '#f8fafc' }} />
          ),
          h4: (props) => (
            <h4 {...props} style={{ fontSize: '1em', fontWeight: 650, margin: '0.85em 0 0.35em', color: '#f1f5f9' }} />
          ),
          h5: (props) => <h5 {...props} style={{ fontSize: '0.95em', fontWeight: 600, margin: '0.8em 0 0.3em' }} />,
          h6: (props) => <h6 {...props} style={{ fontSize: '0.9em', fontWeight: 600, margin: '0.8em 0 0.3em' }} />,
          p: (props) => <p {...props} style={{ margin: '0 0 0.7em' }} />,
          ul: (props) => <ul {...props} style={{ margin: '0.35em 0 0.7em', paddingLeft: 20, listStyle: 'disc' }} />,
          ol: (props) => <ol {...props} style={{ margin: '0.35em 0 0.7em', paddingLeft: 22, listStyle: 'decimal' }} />,
          li: (props) => <li {...props} style={{ margin: '0.22em 0' }} />,
          strong: (props) => <strong {...props} style={{ fontWeight: 650, color: '#f8fafc' }} />,
          em: (props) => <em {...props} style={{ fontStyle: 'italic' }} />,
          hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.12)', margin: '1em 0' }} />,
          a: (props) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer noopener"
              style={{ color: '#38bdf8', textDecoration: 'underline', textUnderlineOffset: 2 }}
            />
          ),
          code({ className, children }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (lang === 'mermaid') {
              return <MermaidDiagram code={codeString} />;
            }

            if (match) {
              return (
                <pre
                  style={{
                    background: 'rgba(0, 0, 0, 0.45)',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    overflowX: 'auto',
                    fontSize: 12,
                  }}
                >
                  <code className={className}>{children}</code>
                </pre>
              );
            }

            return (
              <code
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  padding: '2px 5px',
                  borderRadius: 4,
                  fontSize: '0.9em',
                }}
              >
                {children}
              </code>
            );
          },
          img({ src, alt }: any) {
            const imageSrc =
              resolveImageUrl && src && !src.startsWith('http') && !src.startsWith('/')
                ? resolveImageUrl(src)
                : src;
            return (
              <img
                src={imageSrc}
                alt={alt}
                style={{
                  maxWidth: '100%',
                  borderRadius: 8,
                  margin: '12px 0',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              />
            );
          },
          table({ children }: any) {
            return (
              <div style={{ overflowX: 'auto', margin: '14px 0' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 6,
                  }}
                >
                  {children}
                </table>
              </div>
            );
          },
          th({ children }: any) {
            return (
              <th
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px 12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  textAlign: 'left',
                  fontWeight: 600,
                }}
              >
                {children}
              </th>
            );
          },
          td({ children }: any) {
            return (
              <td
                style={{
                  padding: '8px 12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                {children}
              </td>
            );
          },
          blockquote({ children }: any) {
            return (
              <blockquote
                style={{
                  margin: '12px 0',
                  padding: '8px 16px',
                  borderLeft: '4px solid #38bdf8',
                  background: 'rgba(56, 189, 248, 0.06)',
                  borderRadius: '0 8px 8px 0',
                  color: '#cbd5e1',
                }}
              >
                {children}
              </blockquote>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
