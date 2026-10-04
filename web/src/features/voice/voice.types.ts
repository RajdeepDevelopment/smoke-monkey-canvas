export interface VoiceLanguage {
  code: string;
  label: string;
  flag: string;
}

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
  { code: 'bn-IN', label: 'বাংলা (Bengali)', flag: '🇮🇳' },
];

export function getSavedVoiceLanguage(): string {
  try {
    return localStorage.getItem('sm_voice_language') || 'auto';
  } catch {
    return 'auto';
  }
}

export function saveVoiceLanguage(code: string): void {
  try {
    localStorage.setItem('sm_voice_language', code);
  } catch {}
}
