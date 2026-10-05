import { useState, useEffect, useRef, useCallback } from 'react';
import { getSavedVoiceLanguage, saveVoiceLanguage } from './voice.types.js';

interface IWindowSpeechRecognition extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export type VoiceState = 'idle' | 'listening' | 'speaking' | 'finalizing' | 'error';

export interface UseSpeechToTextOptions {
  initialLanguage?: string;
  continuous?: boolean;
  interimResults?: boolean;
  silenceTimeoutMs?: number; // Defaults to 5500 (5.5s)
  onResult?: (transcript: string, isFinal: boolean) => void;
  onSilence?: (finalTranscript: string) => void;
  onError?: (error: string) => void;
}

export interface UseSpeechToTextReturn {
  isListening: boolean;
  status: VoiceState;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  language: string;
  setLanguage: (lang: string) => void;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  resetTranscript: () => void;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const {
    initialLanguage,
    continuous = true,
    interimResults = true,
    silenceTimeoutMs = 5500, // 5.5 seconds silence auto-stop
    onResult,
    onSilence,
    onError,
  } = options;

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const onSilenceRef = useRef(onSilence);
  onSilenceRef.current = onSilence;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const [language, setLanguageState] = useState<string>(
    initialLanguage || getSavedVoiceLanguage()
  );
  const [status, setStatus] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const userIntentListeningRef = useRef(false);
  const silenceTimerRef = useRef<any>(null);
  const speechActivityTimerRef = useRef<any>(null);
  const transcriptRef = useRef('');
  transcriptRef.current = transcript;

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(
      (window as IWindowSpeechRecognition).SpeechRecognition ||
        (window as IWindowSpeechRecognition).webkitSpeechRecognition
    );

  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (speechActivityTimerRef.current) {
      clearTimeout(speechActivityTimerRef.current);
      speechActivityTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    userIntentListeningRef.current = false;
    clearTimers();
    setStatus('idle');
    setInterimTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, [clearTimers]);

  const scheduleSilenceCheck = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (!userIntentListeningRef.current) return;

    silenceTimerRef.current = setTimeout(() => {
      if (userIntentListeningRef.current) {
        // User has been silent for 5.5s continuous: auto-stop and finalize
        setStatus('finalizing');
        const finalText = (transcriptRef.current || '').trim();
        setTimeout(() => {
          stopListening();
          onSilenceRef.current?.(finalText);
        }, 350);
      }
    }, silenceTimeoutMs);
  }, [silenceTimeoutMs, stopListening]);

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang);
    saveVoiceLanguage(lang);
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang === 'auto' ? (navigator.language || 'en-US') : lang;
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      const msg = 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.';
      setError(msg);
      setStatus('error');
      onErrorRef.current?.(msg);
      return;
    }

    // Explicitly request OS microphone permission to trigger system prompt if not yet granted
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release tracks once permission is verified/granted
        stream.getTracks().forEach((t) => t.stop());
      } catch (err: any) {
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          const msg = 'Microphone permission denied. Please allow microphone access in macOS System Settings > Privacy & Security > Microphone.';
          setError(msg);
          setStatus('error');
          onErrorRef.current?.(msg);
          userIntentListeningRef.current = false;
          return;
        }
      }
    }

    try {
      const SpeechRecognitionClass =
        (window as IWindowSpeechRecognition).SpeechRecognition ||
        (window as IWindowSpeechRecognition).webkitSpeechRecognition;

      if (!recognitionRef.current) {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          if (!userIntentListeningRef.current) {
            try {
              recognition.abort();
            } catch {}
            return;
          }
          setStatus('listening');
          setError(null);
          scheduleSilenceCheck();
        };

        recognition.onresult = (event: any) => {
          if (!userIntentListeningRef.current) return;

          let currentFinal = '';
          let currentInterim = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              currentFinal += item[0].transcript;
            } else {
              currentInterim += item[0].transcript;
            }
          }

          if (!userIntentListeningRef.current) return;

          // Active speech detected: update state to 'speaking'
          setStatus('speaking');
          if (speechActivityTimerRef.current) {
            clearTimeout(speechActivityTimerRef.current);
          }
          speechActivityTimerRef.current = setTimeout(() => {
            if (userIntentListeningRef.current) {
              setStatus('listening');
            }
          }, 1200);

          if (currentFinal) {
            setTranscript((prev) => {
              const updated = prev ? `${prev} ${currentFinal.trim()}` : currentFinal.trim();
              onResultRef.current?.(updated, true);
              return updated;
            });
            setInterimTranscript('');
          } else {
            setInterimTranscript(currentInterim);
            onResultRef.current?.(currentInterim, false);
          }

          // Reset the 5.5s silence countdown whenever words are spoken
          scheduleSilenceCheck();
        };

        recognition.onerror = (event: any) => {
          if (!userIntentListeningRef.current) return;
          if (event.error === 'no-speech') {
            // Benign no-speech event from speech engine: keep silence timer running
            return;
          }
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            const msg = 'Microphone permission denied. Please allow microphone access.';
            setError(msg);
            setStatus('error');
            onErrorRef.current?.(msg);
            userIntentListeningRef.current = false;
            clearTimers();
            return;
          }
          setError(`Speech recognition error: ${event.error}`);
          setStatus('error');
          onErrorRef.current?.(event.error);
        };

        recognition.onend = () => {
          if (userIntentListeningRef.current && continuous) {
            try {
              recognition.start();
              return;
            } catch {}
          }
          setStatus('idle');
          setInterimTranscript('');
        };

        recognitionRef.current = recognition;
      }

      const resolvedLang = language === 'auto' ? (navigator.language || 'en-US') : language;
      recognitionRef.current.lang = resolvedLang;

      userIntentListeningRef.current = true;
      recognitionRef.current.start();
      setStatus('listening');
      setError(null);
      scheduleSilenceCheck();
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        setStatus('listening');
        scheduleSilenceCheck();
      } else {
        console.error('[SpeechToText] Failed to start recognition:', err);
        setError('Failed to start microphone. Please check permissions.');
        setStatus('error');
        onErrorRef.current?.(err.message || 'Failed to start microphone');
      }
    }
  }, [isSupported, continuous, interimResults, language, scheduleSilenceCheck, clearTimers]);

  const toggleListening = useCallback(() => {
    if (status === 'listening' || status === 'speaking') {
      stopListening();
    } else {
      startListening();
    }
  }, [status, stopListening, startListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      userIntentListeningRef.current = false;
      clearTimers();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [clearTimers]);

  return {
    isListening: status === 'listening' || status === 'speaking',
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
  };
}
