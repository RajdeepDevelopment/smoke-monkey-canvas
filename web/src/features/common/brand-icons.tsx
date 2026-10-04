import React from 'react';

export const BrandIcons: Record<string, React.FC<{ size?: number; className?: string }>> = {
  // ── AI Providers ─────────────────────────────────────────────────────────
  nvidia: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#76B900" className={className}>
      <path d="M9.54 6.75c-2.31.25-4.44 1.54-5.59 3.54-1.12 1.95-1.18 4.39-.24 6.42 1.39 3.01 4.55 4.88 7.87 4.55 3.73-.37 6.74-3.18 7.35-6.88.24-1.46.06-2.97-.53-4.32-.23-.52-.82-.77-1.34-.54-.52.23-.77.82-.54 1.34.46 1.05.6 2.21.41 3.34-.48 2.87-2.81 5.06-5.7 5.35-2.57.25-5.01-1.2-6.09-3.54-.73-1.57-.68-3.46.18-4.97.89-1.55 2.54-2.55 4.33-2.75.57-.06.98-.57.92-1.14-.06-.57-.57-.98-1.14-.92l-.92.01zm-.72 3.19c-1.3.17-2.48.97-3.1 2.12-.66 1.23-.62 2.74.09 3.94.88 1.48 2.54 2.33 4.26 2.16 2.06-.21 3.7-1.78 4.02-3.83.13-.84.02-1.7-.31-2.48-.24-.56-.88-.82-1.44-.58-.56.24-.82.88-.58 1.44.22.52.29 1.08.2 1.64-.21 1.37-1.31 2.42-2.69 2.56-1.15.11-2.26-.45-2.85-1.44-.48-.8-.5-1.81-.06-2.63.41-.77 1.2-1.31 2.07-1.42.6-.08.97-.61.89-1.21-.08-.59-.61-.96-1.21-.88l-.29.01zm-.19 3.03c-.45.1-.84.4-.99.85-.2.58.07 1.22.64 1.47.53.23 1.15.06 1.48-.42.27-.4.27-.92.01-1.32-.26-.4-.71-.64-1.14-.58z" />
    </svg>
  ),
  anthropic: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M14.5 3L8.5 19H12l1.2-3.3h4.6l1.2 3.3h3.5L16.5 3h-2zm-.3 9.7l1.3-3.9 1.3 3.9h-2.6zM3 19l4.5-16h3L6 19H3z"
        fill="#D97706"
      />
    </svg>
  ),
  openai: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M20.5 10a4.5 4.5 0 00-.4-3.7 4.6 4.6 0 00-4.3-2.3 4.5 4.5 0 00-3.3-1.5 4.6 4.6 0 00-4.3 2.8 4.5 4.5 0 00-3.7 1.8 4.5 4.5 0 00-.7 4.5 4.5 4.5 0 00.4 3.7 4.6 4.6 0 004.3 2.3 4.5 4.5 0 003.3 1.5 4.6 4.6 0 004.3-2.8 4.5 4.5 0 003.7-1.8 4.5 4.5 0 00.7-4.5zm-8.5 7.5a3 3 0 01-2-1l2.5-1.5.5.3v3l-1-.8zm-4.7-2.3a3 3 0 01-.6-2.2l2.5 1.5v.6l-2.6 1.5.7-1.4zm-.7-5.5a3 3 0 011.4-1.8l1.3 2.3-.5.3-2.6-1.5.4.7zm7.4 3.8l-2.5-1.5.5-.3 2.6 1.5-.6.3zm1.5-1.8l-1.3-2.3.5-.3 2.6 1.5-.4.8a3 3 0 01-1.4.3zm.7-3.7a3 3 0 01.6 2.2l-2.5-1.5v-.6l2.6-1.5-.7 1.4z"
        fill="#10A37F"
      />
    </svg>
  ),
  gemini: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"
        fill="url(#gemini_grad)"
      />
      <defs>
        <linearGradient id="gemini_grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E88E5" />
          <stop offset="0.5" stopColor="#9C27B0" />
          <stop offset="1" stopColor="#E91E63" />
        </linearGradient>
      </defs>
    </svg>
  ),
  groq: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="#F55036" strokeWidth="2.5" />
      <path d="M12 7v10M7 12h10" stroke="#F55036" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  openrouter: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 12h16M12 4l8 8-8 8" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  xai: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  deepseek: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z" fill="#0EA5E9" />
    </svg>
  ),
  mistral: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#F97316" className={className}>
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="16" y="3" width="5" height="5" rx="1" />
      <rect x="3" y="10" width="5" height="5" rx="1" />
      <rect x="10" y="10" width="5" height="5" rx="1" />
      <rect x="16" y="10" width="5" height="5" rx="1" />
      <rect x="3" y="17" width="5" height="5" rx="1" />
      <rect x="16" y="17" width="5" height="5" rx="1" />
    </svg>
  ),
  qwen: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="#6366F1" strokeWidth="2" />
      <path d="M8 12h8M12 8v8" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  together: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="9" cy="12" r="5" stroke="#EC4899" strokeWidth="2" />
      <circle cx="15" cy="12" r="5" stroke="#8B5CF6" strokeWidth="2" />
    </svg>
  ),
  cerebras: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="#F43F5E" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" fill="#F43F5E" />
    </svg>
  ),
  omniroute: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // ── Stock MCP Integrations ────────────────────────────────────────────────
  github: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  ),
  gitlab: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FC6D26" className={className}>
      <path d="M22.65 14.39L20.61 8.1c-.13-.39-.4-.7-.77-.88-.36-.18-.78-.2-1.17-.06-.39.13-.7.4-.88.76l-2.07 4.2H8.28l-2.07-4.2c-.18-.36-.49-.63-.88-.76-.39-.14-.81-.12-1.17.06-.37.18-.64.49-.77.88L1.35 14.39c-.14.43-.09.91.13 1.31.23.4.63.67 1.09.73l9.04 4.54c.25.13.54.13.79 0l9.04-4.54c.46-.06.86-.33 1.09-.73.22-.4.27-.88.12-1.31z" />
    </svg>
  ),
  slack: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 14.5a2.5 2.5 0 11-2.5-2.5H6v2.5zm1 0a2.5 2.5 0 115 0v6a2.5 2.5 0 11-5 0v-6z" fill="#E01E5A" />
      <path d="M9.5 6a2.5 2.5 0 112.5-2.5V6H9.5zm0 1a2.5 2.5 0 110 5h-6a2.5 2.5 0 110-5h6z" fill="#36C5F0" />
      <path d="M18 9.5a2.5 2.5 0 112.5 2.5H18V9.5zm-1 0a2.5 2.5 0 11-5 0v-6a2.5 2.5 0 115 0v6z" fill="#2EB67D" />
      <path d="M14.5 18a2.5 2.5 0 11-2.5 2.5V18h2.5zm0-1a2.5 2.5 0 110-5h6a2.5 2.5 0 110 5h-6z" fill="#ECB22E" />
    </svg>
  ),
  notion: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l11.45-.699c.42-.047.747-.327.607-.84-.14-.42-.513-.746-.933-.746L4.74 3.042c-.653 0-.933.373-.281 1.166zm1.12 3.826v11.85c0 .933.513 1.353 1.493 1.353h11.298c.98 0 1.4-.42 1.4-1.353V8.034H5.579zm9.052 2.333c1.4 0 2.24.793 2.24 2.147v6.486c0 .42-.234.653-.654.653h-1.306c-.42 0-.654-.233-.654-.653v-5.833c0-.607-.373-.887-.933-.887-.56 0-.98.28-.98.887v5.833c0 .42-.234.653-.654.653H11.34c-.42 0-.654-.233-.654-.653v-5.833c0-.607-.373-.887-.933-.887-.56 0-.98.28-.98.887v5.833c0 .42-.234.653-.654.653H6.813c-.42 0-.654-.233-.654-.653v-6.486c0-1.354.84-2.147 2.24-2.147 1.12 0 1.96.606 2.333 1.54.42-.934 1.26-1.54 2.38-1.54h1.519z" />
    </svg>
  ),
  googledrive: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7.71 3.5L1.29 14.5l3.85 6.66L11.56 10.15 7.71 3.5z" fill="#0066DA" />
      <path d="M16.29 3.5H7.71l3.85 6.65h8.58L16.29 3.5z" fill="#00AC47" />
      <path d="M12.71 14.5l-3.85 6.66h12.85l3.86-6.66H12.71z" fill="#FFBA00" />
      <path d="M8.86 21.16l3.85-6.66 3.86 6.66H8.86z" fill="#EA4335" />
    </svg>
  ),
  google: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  ),
  sentry: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#362D59" className={className}>
      <path d="M13.1 3.4c-.6-.7-1.6-.7-2.2 0L2.4 13.9c-.6.7-.2 1.8.8 1.8h2.3l4.3-5.3c.4-.5 1.2-.5 1.6 0l2.7 3.3 2.1-2.6-3.1-7.7zm8.5 12.3l-5.6-6.9-1.9 2.3 4.2 5.2c.4.5.1 1.3-.6 1.3H4.8l-1.5 1.8c-.6.7-.2 1.8.8 1.8h16.2c1 0 1.6-1.1 1.3-1.9l-2.1-3.6z" fill="#FF4F64" />
    </svg>
  ),
  playwright: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M14.5 4.5C12 4.5 10 6.5 10 9c0 1.5.7 2.8 1.8 3.6L7.5 18H11l2.5-3.5h2.5c2.5 0 4.5-2 4.5-4.5s-2-5.5-6-5.5zm.5 7c-1.4 0-2.5-1.1-2.5-2.5S13.6 6.5 15 6.5s2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z" fill="#2EAD33" />
      <path d="M8 8C5.5 8 3.5 10 3.5 12.5S5.5 17 8 17c1.5 0 2.8-.7 3.6-1.8L13 18.5" stroke="#E34F26" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  git: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#F05032" className={className}>
      <path d="M21.62 10.45L13.55 2.38c-.51-.51-1.33-.51-1.84 0L9.88 4.22l2.33 2.33c.54-.18 1.18-.06 1.61.37.43.43.55 1.07.37 1.61l2.25 2.25c.54-.18 1.18-.06 1.61.37.61.61.61 1.61 0 2.22-.61.61-1.61.61-2.22 0-.44-.44-.56-1.09-.36-1.63L13.28 9.5v5.34c.18.09.35.21.49.35.61.61.61 1.61 0 2.22-.61.61-1.61.61-2.22 0-.61-.61-.61-1.61 0-2.22.17-.17.37-.29.58-.37V9.41c-.21-.08-.41-.2-.58-.37-.44-.44-.56-1.09-.36-1.63L8.85 5.07 2.38 11.54c-.51.51-.51 1.33 0 1.84l8.07 8.07c.51.51 1.33.51 1.84 0l9.33-9.33c.51-.51.51-1.34 0-1.84z" />
    </svg>
  ),
  filesystem: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 4h6l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" fill="rgba(59,130,246,0.15)" />
      <path d="M8 13h8M8 17h5" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  docker: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#2496ED" className={className}>
      <path d="M13.98 10.02h2.24V7.78h-2.24v2.24zm-2.8 0h2.24V7.78h-2.24v2.24zm-2.8 0h2.24V7.78H8.38v2.24zm-2.8 0h2.24V7.78H5.58v2.24zm5.6-2.8h2.24V4.98h-2.24v2.24zm-2.8 0h2.24V4.98H8.38v2.24zm8.4 2.8h2.24V7.78h-2.24v2.24zM21.94 12c-.52-.39-1.42-.51-2.14-.38-.28-1.57-1.43-2.64-1.43-2.64s-.37 1.48.33 2.65c-.71.4-1.63.4-2.22.18-.75-.29-2.18-.31-4.04-.31H2.4c-.26.85-.4 1.76-.4 2.7 0 4.97 4.48 9 10 9 4.8 0 8.8-3.08 9.8-7.3.75-.42 1.34-1.12 1.34-1.9 0-.38-.4-.74-1.2-1z" />
    </svg>
  ),
  kubernetes: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#326CE5" className={className}>
      <path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2zm0 3.3L5.5 9v6l6.5 3.7 6.5-3.7V9L12 5.3zm0 3.2a3.5 3.5 0 110 7 3.5 3.5 0 010-7zm0 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
    </svg>
  ),
  aws: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF9900" className={className}>
      <path d="M12 15c-3.7 0-6.9 1.8-8.8 4.6-.3.4-.1.9.4.9.4 0 .7-.2.9-.5 1.6-2.3 4.4-3.8 7.5-3.8s5.9 1.5 7.5 3.8c.2.3.5.5.9.5.5 0 .7-.5.4-.9-1.9-2.8-5.1-4.6-8.8-4.6zm8.8 3.5c-.3-.4-1.3-.5-2.2-.4-.2 0-.3.2-.2.4.5.9 1.5 1.8 2.2 1.9.2 0 .4-.1.4-.3 0-.4-.1-1.1-.2-1.6zM6.5 10.2c0-1.8 1.2-2.8 3-2.8 1.4 0 2.4.6 2.8 1.5V7.6h1.8v5.7c0 1.2-.5 1.8-1.5 1.8-1.1 0-1.7-.5-1.9-1.2-.5.8-1.3 1.3-2.4 1.3-1.6.1-2.8-1-2.8-2.6l1-.4zm3.9.7c0-.9-.6-1.5-1.5-1.5-.8 0-1.4.6-1.4 1.5s.6 1.5 1.4 1.5c.9 0 1.5-.6 1.5-1.5z" />
    </svg>
  ),
  cloudflare: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#F38020" className={className}>
      <path d="M18.8 11.2c-.3-2.4-2.3-4.2-4.8-4.2-2 0-3.8 1.2-4.5 3-.5-.2-1-.3-1.5-.3-2.5 0-4.5 2-4.5 4.5 0 .2 0 .4.1.6C1.4 15.3 0 17 0 19c0 2.2 1.8 4 4 4h14.5c3 0 5.5-2.5 5.5-5.5 0-2.8-2.1-5.1-4.9-5.4l-.3-.9z" />
    </svg>
  ),
  supabase: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#3ECF8E" className={className}>
      <path d="M13.4 2.2c-.4-.5-1.2-.2-1.2.5v9.1H3.6c-.6 0-.9.7-.5 1.1l8.4 10.1c.4.5 1.2.2 1.2-.5v-9.1h8.6c.6 0 .9-.7.5-1.1L13.4 2.2z" />
    </svg>
  ),
  redis: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#DC382D" className={className}>
      <path d="M2 9.5L12 4l10 5.5-10 5.5L2 9.5zm0 5l10 5.5 10-5.5v2.5L12 22.5 2 17v-2.5z" />
    </svg>
  ),
  linear: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#5E6AD2" className={className}>
      <circle cx="12" cy="12" r="9" stroke="#5E6AD2" strokeWidth="2.5" fill="none" />
      <path d="M7 17L17 7" stroke="#5E6AD2" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  jira: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0052CC" className={className}>
      <path d="M11.5 2C11.5 6.5 8 10 3.5 10V2h8zm0 5c0 4.5 3.5 8 8 8V7h-8zm-4.5 5c0 4.5 3.5 8 8 8v-8H7z" />
    </svg>
  ),
  confluence: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#172B4D" className={className}>
      <path d="M4 17.5c0-3 2.5-5.5 5.5-5.5h5c3 0 5.5-2.5 5.5-5.5S17.5 1 14.5 1h-5C6.5 1 4 3.5 4 6.5v11zm16-11c0 3-2.5 5.5-5.5 5.5h-5c-3 0-5.5 2.5-5.5 5.5S6.5 23 9.5 23h5c3 0 5.5-2.5 5.5-5.5v-11z" fill="#0052CC" />
    </svg>
  ),
  brave: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FB542B" className={className}>
      <path d="M12 2l6 4v5c0 5-3.5 9.5-6 11-2.5-1.5-6-6-6-11V6l6-4zm0 4.5L8.5 8v3.5c0 3.2 2 6.1 3.5 7.2 1.5-1.1 3.5-4 3.5-7.2V8L12 6.5z" />
    </svg>
  ),
  stripe: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#635BFF" className={className}>
      <path d="M13.9 8.8c0-.7-.6-1-1.6-1-1.3 0-2.8.4-3.9 1.1L7.5 6c1.3-.7 3.1-1.2 4.9-1.2 3.8 0 6.2 1.9 6.2 5.1 0 4.9-6.8 4.1-6.8 6.2 0 .8.7 1.1 1.7 1.1 1.5 0 3.3-.6 4.4-1.3l.8 2.8c-1.3.8-3.4 1.3-5.3 1.3-4 0-6.5-2-6.5-5.1 0-5.2 7-4.3 7-6.1z" />
    </svg>
  ),
  mongodb: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#13AA52" className={className}>
      <path d="M12 2C11.5 3 7 9.5 7 14c0 3 2 5.5 5 6v2c0 .5.5 1 1 1s1-.5 1-1v-2c3-.5 5-3 5-6 0-4.5-4.5-11-5-12z" />
    </svg>
  ),
  mysql: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#00758F" className={className}>
      <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9zm4 11.5c-1 1-2.5 1.5-4 1.5s-3-.5-4-1.5l1.5-1.5c.7.7 1.6 1 2.5 1s1.8-.3 2.5-1l1.5 1.5z" />
    </svg>
  ),
  postgres: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3C7 3 4 6 4 10c0 4 3 7 8 7 1 0 2 0 3-.5v3.5c0 1 1 2 2 2h2v-3h-2v-3.5c3-1.5 5-4.5 5-8.5 0-4-4-7-10-7z"
        fill="#336791"
      />
    </svg>
  ),
  sqlite: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 6c0-1.657 3.582-3 8-3s8 1.343 8 3v12c0 1.657-3.582 3-8 3s-8-1.343-8-3V6z"
        stroke="#003B57"
        strokeWidth="2"
      />
      <path d="M4 12c0 1.657 3.582 3 8 3s8-1.343 8-3" stroke="#003B57" strokeWidth="2" />
    </svg>
  ),
  firecrawl: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2c1 3.5 3.5 5 4.5 8 1 3 0 6.5-2.5 8.5 3-1 4.5-3.5 4.5-6.5 0-3-1.5-5.5-2.5-7 1 2 2 4.5 2 7 0 4-3.5 7-8.5 7S4 15.5 4 11.5c0-4 3.5-7.5 5-9 0 2 .5 4 2 5.5C11.5 5.5 12 3.5 12 2z"
        fill="#FF5722"
      />
    </svg>
  ),
  tavily: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="11" cy="11" r="7" stroke="#3B82F6" strokeWidth="2.5" />
      <path d="M16 16l4.5 4.5" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  puppeteer: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm4 0h-2v-2h2v2zm-2-4h-2V7h2v6z" fill="#00D8A2" />
      <path d="M4 10l8-8 8 8-8 12L4 10z" stroke="#00D8A2" strokeWidth="2" fill="none" />
    </svg>
  ),
  snowflake: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#29B5E8" strokeWidth="2" strokeLinecap="round" className={className}>
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
      <circle cx="12" cy="12" r="2.5" fill="#29B5E8" />
    </svg>
  ),
  datadog: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#632CA6" className={className}>
      <path d="M19.5 4.5c-.8-.8-2-1-3-.5l-2.2 1.1c-.8.4-1.8.4-2.6 0L9.5 4c-1-.5-2.2-.3-3 .5-1.2 1.2-1.2 3.1 0 4.3l1.8 1.8c.4.4.6 1 .5 1.6-.2 1.2-.2 2.4 0 3.6.1.6-.1 1.2-.5 1.6l-1.8 1.8c-1.2 1.2-1.2 3.1 0 4.3.8.8 2 1 3 .5l2.2-1.1c.8-.4 1.8-.4 2.6 0l2.2 1.1c1 .5 2.2.3 3-.5 1.2-1.2 1.2-3.1 0-4.3l-1.8-1.8c-.4-.4-.6-1-.5-1.6.2-1.2.2-2.4 0-3.6-.1-.6.1-1.2.5-1.6l1.8-1.8c1.2-1.2 1.2-3.1 0-4.3z" />
    </svg>
  ),
  discord: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#5865F2" className={className}>
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  ),
  zendesk: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#03363D" className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.7 0 3.2.7 4.2 1.8l-8.4 8.4C6.7 14.2 6 12.7 6 11c0-3.3 2.7-6 6-6zm0 14c-1.7 0-3.2-.7-4.2-1.8l8.4-8.4c1.1 1 1.8 2.5 1.8 4.2 0 3.3-2.7 6-6 6z" />
    </svg>
  ),
  intercom: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1F8CEB" className={className}>
      <path d="M19.5 3h-15C3.1 3 2 4.1 2 5.5v10c0 1.4 1.1 2.5 2.5 2.5h2v3.5c0 .4.5.7.8.4l4.2-3.9h8c1.4 0 2.5-1.1 2.5-2.5v-10c0-1.4-1.1-2.5-2.5-2.5zm-11 9H7V7h1.5v5zm3.5 1h-1.5V6H12v7zm3.5-1H14V7h1.5v5zm3.5-1h-1.5V8H19v3z" />
    </svg>
  ),
  twilio: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#F22F46" className={className}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <circle cx="8" cy="16" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  ),
  figma: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M8 2a3 3 0 000 6h4V2H8z" fill="#F24E1E" />
      <path d="M12 2h4a3 3 0 010 6h-4V2z" fill="#FF7262" />
      <path d="M8 8a3 3 0 000 6h4V8H8z" fill="#A259FF" />
      <path d="M12 8h4a3 3 0 010 6h-4V8z" fill="#1ABCFE" />
      <path d="M8 14a3 3 0 103 3v-3H8z" fill="#0ACF83" />
    </svg>
  ),
  hubspot: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF7A59" className={className}>
      <path d="M18.8 8.4V6.2c.7-.4 1.2-1.2 1.2-2.2 0-1.4-1.1-2.5-2.5-2.5S15 2.6 15 4c0 1 .5 1.8 1.2 2.2v2.2c-.9.5-1.6 1.3-2 2.3l-5.6-4.3c.1-.4.1-.7.1-1.1 0-2.2-1.8-4-4-4S.7 3.1.7 5.3s1.8 4 4 4c.8 0 1.6-.2 2.2-.7l5.4 4.2c-.2.7-.3 1.4-.3 2.2 0 1.2.3 2.4.9 3.4l-2.4 2.4c-.4-.2-.8-.4-1.3-.4-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3c0-.5-.1-.9-.4-1.3l2.4-2.4c1.1.7 2.4 1.1 3.8 1.1 3.9 0 7-3.1 7-7 0-2.8-1.6-5.2-4-6.3zm-1.3 9.3c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" />
    </svg>
  ),
  salesforce: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#00A1E0" className={className}>
      <path d="M10.2 4.4c1.4-1.4 3.4-2.2 5.5-2.1 3.4.1 6.3 2.4 7.2 5.7 1.2.6 2.2 1.6 2.7 2.8.5 1.3.5 2.7.1 4-.6 1.8-2 3.1-3.8 3.7-.6.2-1.3.3-2 .3H5.8c-1.3 0-2.5-.5-3.4-1.4-1-1-1.5-2.3-1.4-3.6.1-1.4.8-2.6 1.9-3.4 1.1-.8 2.5-1.1 3.8-.8.6-1.5 1.7-2.7 3.1-3.4.1-.6.3-1.3.4-1.9z" />
    </svg>
  ),
  exa: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8" stroke="#10B981" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="3" fill="#10B981" />
    </svg>
  ),
  producthunt: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#DA552F" className={className}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-3v-8h3c1.66 0 3 1.34 3 3s-1.34 3-3 3zm0-4h-1v-2h1c.55 0 1 .45 1 1s-.45 1-1 1z" />
    </svg>
  ),
  reddit: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF4500" className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="8.5" cy="12.5" r="1.5" fill="#fff" />
      <circle cx="15.5" cy="12.5" r="1.5" fill="#fff" />
      <path d="M9 16c1 1 5 1 6 0" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="18" cy="8" r="1.2" fill="#fff" />
      <path d="M12 7l1.5-3 3.5 1" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  bluesky: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#1185FE" className={className}>
      <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566 1.01 1.5 2.1 1.5 4.5c0 1.258.556 6.096 1.05 7.5.94 2.673 3.45 3.327 4.95 3.1-2.5.5-5 2.2-2.5 5.4 3 3.8 6.5-1.5 7-4.2.5 2.7 4 8 7 4.2 2.5-3.2 0-4.9-2.5-5.4 1.5.227 4.01-.427 4.95-3.1.494-1.404 1.05-6.242 1.05-7.5 0-2.4-1.066-3.49-3.702-1.695C16.046 4.747 13.087 8.686 12 10.8z" />
    </svg>
  ),
  linkedin: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2" className={className}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  ),
  twitter: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  youtube: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF0000" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  devto: ({ size = 16, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect width="24" height="24" rx="4" fill="#0A0A0A" />
      <path d="M7.4 15.5H5.8V8.5h1.6c1.7 0 2.7.9 2.7 2.4v2.2c0 1.5-1 2.4-2.7 2.4zm-.2-1.3c.7 0 1.2-.4 1.2-1.2v-2c0-.8-.5-1.2-1.2-1.2h-.4v4.4h.4zm4.2 1.3h-1.4V8.5h1.4v7zm6 0h-3.4V8.5H16v1.3h-1.9v1.6h1.7v1.3h-1.7v1.6h2z" fill="#fff" />
    </svg>
  ),
};

export const getBrandIcon = (key: string, size = 16) => {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Sort keys by descending length so specific keys (e.g. 'github', 'googledrive') match before prefixes (e.g. 'git', 'google')
  const sortedKeys = Object.keys(BrandIcons).sort((a, b) => b.length - a.length);
  for (const k of sortedKeys) {
    if (normalized.includes(k)) {
      const IconComponent = BrandIcons[k];
      return <IconComponent size={size} />;
    }
  }
  return null;
};
