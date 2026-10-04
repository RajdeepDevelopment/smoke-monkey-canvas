import React, { useRef, useEffect } from 'react';
import { Mic, Square, Check, AlertCircle } from 'lucide-react';
import { useSpeechToText } from './use-speech-to-text.js';
import { SUPPORTED_VOICE_LANGUAGES } from './voice.types.js';

export interface ChatVoiceButtonProps {
  currentValue?: string;
  onValueChange?: (val: string) => void;
  onTranscript?: (spokenText: string) => void;
  disabled?: boolean;
}

export const ChatVoiceButton: React.FC<ChatVoiceButtonProps> = ({
  currentValue = '',
  onValueChange,
  onTranscript,
  disabled = false,
}) => {
  const baseTextRef = useRef('');

  const {
    status,
    transcript,
    interimTranscript,
    language,
    setLanguage,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechToText({
    continuous: true,
    interimResults: true,
    silenceTimeoutMs: 5500, // 5.5s continuous silence auto-stop
    onSilence: (finalText) => {
      const cleanSpoken = finalText.trim();
      if (cleanSpoken) {
        const full = baseTextRef.current
          ? `${baseTextRef.current} ${cleanSpoken}`
          : cleanSpoken;
        onValueChange?.(full);
        onTranscript?.(cleanSpoken);
      }
    },
  });

  // Keep input updated in real time as speech streams in
  useEffect(() => {
    if (status === 'speaking' || status === 'listening') {
      const spokenCombined = (
        transcript + (interimTranscript ? (transcript ? ' ' : '') + interimTranscript : '')
      ).trim();

      if (spokenCombined && onValueChange) {
        const full = baseTextRef.current
          ? `${baseTextRef.current} ${spokenCombined}`
          : spokenCombined;
        onValueChange(full);
      }
    }
  }, [transcript, interimTranscript, status, onValueChange]);

  const handleStart = () => {
    baseTextRef.current = (currentValue || '').trim();
    resetTranscript();
    startListening();
  };

  const handleStop = () => {
    const spokenCombined = (
      transcript + (interimTranscript ? (transcript ? ' ' : '') + interimTranscript : '')
    ).trim();
    stopListening();
    if (spokenCombined) {
      const full = baseTextRef.current
        ? `${baseTextRef.current} ${spokenCombined}`
        : spokenCombined;
      onValueChange?.(full);
      onTranscript?.(spokenCombined);
    }
  };

  const currentLangObj =
    SUPPORTED_VOICE_LANGUAGES.find((l) => l.code === language) ||
    SUPPORTED_VOICE_LANGUAGES[0];

  return (
    <div
      className="chat-voice-toolbar-group"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Dynamic Voice Button based on State */}
      {status === 'speaking' ? (
        <button
          type="button"
          className="chat-voice-btn state-speaking"
          disabled={disabled}
          onClick={handleStop}
          title="Speaking detected. Click to stop recording."
        >
          <div className="mic-pulse-ring" />
          <Square size={11} fill="currentColor" className="voice-stop-icon" />
          <div className="voice-mini-equalizer">
            <span className="eq-bar eq-1" />
            <span className="eq-bar eq-2" />
            <span className="eq-bar eq-3" />
          </div>
          <span className="voice-btn-label">Speaking…</span>
        </button>
      ) : status === 'listening' ? (
        <button
          type="button"
          className="chat-voice-btn state-listening"
          disabled={disabled}
          onClick={handleStop}
          title="Listening for speech (auto-stops after 5s silence). Click to stop."
        >
          <div className="mic-pulse-ring amber" />
          <Mic size={14} className="voice-mic-icon-pulse" />
          <span className="voice-btn-label">Listening…</span>
        </button>
      ) : status === 'finalizing' ? (
        <button
          type="button"
          className="chat-voice-btn state-finalizing"
          disabled
        >
          <Check size={13} color="#10b981" />
          <span className="voice-btn-label success">Done</span>
        </button>
      ) : status === 'error' ? (
        <button
          type="button"
          className="chat-voice-btn state-error"
          onClick={handleStart}
          title="Microphone permission required. Click to retry."
        >
          <AlertCircle size={13} color="#f59e0b" />
          <span className="voice-btn-label error">Retry Mic</span>
        </button>
      ) : (
        <button
          type="button"
          className="chat-voice-btn state-idle"
          disabled={disabled}
          onClick={handleStart}
          title="Voice to Text (Speak your prompt — auto-finishes after silence)"
        >
          <Mic size={14} className="voice-mic-icon" />
          <span className="voice-btn-label">Voice</span>
        </button>
      )}

      {/* Clean Compact Native Language Selector (Single clean flag icon) */}
      <div
        className="chat-voice-lang-select-wrap"
        title={`Speech Language: ${currentLangObj.label}`}
      >
        <select
          className="chat-voice-lang-native-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Speech Recognition Language"
        >
          {SUPPORTED_VOICE_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
