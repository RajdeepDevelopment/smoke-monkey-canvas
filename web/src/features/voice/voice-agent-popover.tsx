import React, { useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Send,
  X,
  RotateCcw,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useSpeechToText } from './use-speech-to-text.js';
import { SUPPORTED_VOICE_LANGUAGES } from './voice.types.js';
import type { SpaceAgentEntity } from '../agent/agent.types.js';

interface VoiceAgentPopoverProps {
  agent: SpaceAgentEntity;
  onClose: () => void;
  onSend: (text: string) => void;
}

export const VoiceAgentPopover: React.FC<VoiceAgentPopoverProps> = ({
  agent,
  onClose,
  onSend,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasStartedRef = useRef(false);

  const {
    status,
    transcript,
    interimTranscript,
    error,
    isSupported,
    language,
    setLanguage,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    setTranscript,
  } = useSpeechToText({
    continuous: true,
    interimResults: true,
    silenceTimeoutMs: 5500, // Auto-stop on 5.5s silence
    onSilence: (finalText) => {
      if (finalText) {
        setTranscript(finalText);
      }
    },
  });

  // Auto-start listening on popover open only once
  useEffect(() => {
    if (isSupported && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startListening();
    }
  }, [isSupported, startListening]);

  // Combined text to show in the textarea
  const displayText =
    transcript + (interimTranscript ? (transcript ? ' ' : '') + interimTranscript : '');

  // Keep textarea scrolled to bottom as text streams in
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [displayText]);

  const currentLangObj =
    SUPPORTED_VOICE_LANGUAGES.find((l) => l.code === language) ||
    SUPPORTED_VOICE_LANGUAGES[0];

  const handleConfirmAndSend = () => {
    const finalClean = displayText.trim();
    if (!finalClean) return;
    stopListening();
    onSend(finalClean);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirmAndSend();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      stopListening();
      onClose();
    }
  };

  const isRecording = status === 'speaking' || status === 'listening';

  return (
    <div
      className="voice-agent-popover nodrag nopan"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ReactFlow-style connecting edge from Voice Popover down to Agent Card */}
      <div className="voice-connector-wrap">
        <svg
          className="voice-popover-connector-svg"
          width="24"
          height="28"
          viewBox="0 0 24 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="popoverStemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="stemGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#10b981" floodOpacity="0.7" />
            </filter>
          </defs>
          {/* Top anchor bead on popover bottom */}
          <circle cx="12" cy="2" r="3" fill="#34d399" filter="url(#stemGlow)" />
          {/* Continuous edge connecting line */}
          <line
            x1="12"
            y1="2"
            x2="12"
            y2="20"
            stroke="url(#popoverStemGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#stemGlow)"
          />
          {/* Arrowhead landing directly on the top border of the agent card */}
          <polygon
            points="7,19 17,19 12,28"
            fill="#10b981"
            filter="url(#stemGlow)"
          />
        </svg>
      </div>

      {/* Header: Clean status + Language + Close */}
      <div className="voice-popover-header">
        <div className="voice-header-status">
          {status === 'speaking' ? (
            <div className="voice-status-pill speaking">
              <span className="voice-pulse-dot red" />
              <span className="status-text">Speaking…</span>
              <div className="voice-mini-bars">
                <span className="bar b1" />
                <span className="bar b2" />
                <span className="bar b3" />
              </div>
            </div>
          ) : status === 'listening' ? (
            <div className="voice-status-pill listening">
              <span className="voice-pulse-dot amber" />
              <span className="status-text">Listening…</span>
            </div>
          ) : status === 'finalizing' ? (
            <div className="voice-status-pill finalizing">
              <Check size={12} color="#10b981" />
              <span className="status-text">Done</span>
            </div>
          ) : (
            <div className="voice-status-pill idle">
              <span className="voice-pulse-dot gray" />
              <span className="status-text">Ready</span>
            </div>
          )}
        </div>

        <div className="voice-header-actions">
          {/* Language selector (Single flag, clean pill) */}
          <div className="voice-popover-lang-wrap" title={`Speech Language: ${currentLangObj.label}`}>
            <select
              className="voice-popover-lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Select speech language"
            >
              {SUPPORTED_VOICE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Close button */}
          <button
            type="button"
            className="voice-close-btn"
            onClick={() => {
              stopListening();
              onClose();
            }}
            title="Close voice input"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="voice-error-banner">
          <AlertCircle size={12} color="#f59e0b" />
          <span>{error}</span>
        </div>
      )}

      {/* Minimalist Input Area */}
      <div className={`voice-input-container ${isRecording ? 'recording' : ''}`}>
        <textarea
          ref={textareaRef}
          className="voice-textarea"
          rows={3}
          value={displayText}
          onChange={(e) => setTranscript(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Speak or type to ${agent.name}…`}
          autoFocus
        />
        {interimTranscript && (
          <div className="voice-interim-tag">
            <span className="interim-pulse" />
            <span>hearing: {interimTranscript}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="voice-popover-footer">
        <div className="voice-footer-left">
          {isRecording ? (
            <button
              type="button"
              className="voice-mic-toggle-btn active-stop"
              onClick={stopListening}
              title="Stop listening now"
            >
              <Square size={11} fill="currentColor" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              className="voice-mic-toggle-btn idle-listen"
              onClick={toggleListening}
              title="Resume speech listening"
            >
              <Mic size={13} />
              <span>Listen</span>
            </button>
          )}

          {displayText && (
            <button
              type="button"
              className="voice-clear-btn"
              onClick={resetTranscript}
              title="Clear transcript"
            >
              <RotateCcw size={11} />
              <span>Clear</span>
            </button>
          )}
        </div>

        <button
          type="button"
          className="voice-send-btn"
          disabled={!displayText.trim()}
          onClick={handleConfirmAndSend}
          title={`Send to ${agent.name} (Opens Chat & Starts New Discussion)`}
        >
          <span>Send</span>
          <Send size={12} />
        </button>
      </div>
    </div>
  );
};
