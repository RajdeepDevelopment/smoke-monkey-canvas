export interface VoiceLanguage {
  code: string;
  label: string;
  flag: string;
  /**
   * Speech engines that can actually recognize this language. Omitted = every
   * engine. Engines are not interchangeable: each platform's Web Speech API is
   * backed by a different recognizer.
   *   'apple'    → Apple Speech (Safari, macOS/iOS Tauri webviews) — matches
   *                SFSpeechRecognizer.supportedLocales(), which has no Bengali.
   *   'chromium' → Google-backed recognition (Chrome, Edge, Windows WebView2,
   *                Android Chrome) — does support Bengali.
   */
  engines?: SpeechEngine[];
}

export type SpeechEngine = 'apple' | 'chromium' | 'other';

export const SUPPORTED_VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: 'auto', label: 'Auto (Browser Default)', flag: '🌐' },
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
  { code: 'es-ES', label: 'Español (Spanish)', flag: '🇪🇸' },
  { code: 'fr-FR', label: 'Français (French)', flag: '🇫🇷' },
  { code: 'de-DE', label: 'Deutsch (German)', flag: '🇩🇪' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'zh-CN', label: '中文 (Mandarin)', flag: '🇨🇳' },
  { code: 'ja-JP', label: '日本語 (Japanese)', flag: '🇯🇵' },
  { code: 'pt-BR', label: 'Português (Portuguese)', flag: '🇧🇷' },
  { code: 'it-IT', label: 'Italiano (Italian)', flag: '🇮🇹' },
  { code: 'ru-RU', label: 'Русский (Russian)', flag: '🇷🇺' },
  { code: 'ar-SA', label: 'العربية (Arabic)', flag: '🇸🇦' },
  { code: 'ko-KR', label: '한국어 (Korean)', flag: '🇰🇷' },
  { code: 'nl-NL', label: 'Nederlands (Dutch)', flag: '🇳🇱' },
  { code: 'tr-TR', label: 'Türkçe (Turkish)', flag: '🇹🇷' },
  { code: 'id-ID', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'vi-VN', label: 'Tiếng Việt (Vietnamese)', flag: '🇻🇳' },
  { code: 'bn-IN', label: 'বাংলা (Bengali)', flag: '🇮🇳', engines: ['chromium'] },
];

let cachedEngine: SpeechEngine | null = null;

/**
 * Which recognizer backs `SpeechRecognition` here. Detected once from the UA:
 * iOS/iPadOS browsers are always WebKit regardless of their name; everything
 * Chrome-branded (incl. Edge/Opera/Samsung/WebView2) uses Google recognition.
 */
export function detectSpeechEngine(): SpeechEngine {
  if (cachedEngine) return cachedEngine;
  if (typeof navigator === 'undefined') {
    cachedEngine = 'other';
    return cachedEngine;
  }
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) cachedEngine = 'apple';
  else if (/Chrome|Chromium|CriOS|Edg|OPR/.test(ua)) cachedEngine = 'chromium';
  else if (/AppleWebKit/.test(ua)) cachedEngine = 'apple';
  else cachedEngine = 'other';
  return cachedEngine;
}

/** Languages this platform can actually recognize — use this for all UI lists. */
export function getAvailableVoiceLanguages(): VoiceLanguage[] {
  const engine = detectSpeechEngine();
  return SUPPORTED_VOICE_LANGUAGES.filter((l) => !l.engines || l.engines.includes(engine));
}

export function isVoiceLanguageAvailable(code: string): boolean {
  return getAvailableVoiceLanguages().some((l) => l.code === code);
}

export function getVoiceLanguageLabel(code: string): string {
  return SUPPORTED_VOICE_LANGUAGES.find((l) => l.code === code)?.label || code;
}

export function getSavedVoiceLanguage(): string {
  try {
    const saved = localStorage.getItem('sm_voice_language') || 'auto';
    // A saved pick may come from another platform (e.g. Bengali chosen on
    // Windows); never carry it over to an engine that cannot recognize it.
    return isVoiceLanguageAvailable(saved) ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

export function saveVoiceLanguage(code: string): void {
  try {
    localStorage.setItem('sm_voice_language', code);
  } catch {}
}
