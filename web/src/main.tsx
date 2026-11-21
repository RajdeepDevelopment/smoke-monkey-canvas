import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@smoke-monkey/ui/ui.css'
import App from './App.tsx'
import { initDesktopBridge, ensureAuthToken } from './config/desktop.bridge.ts'

// Auth token must be cached before initDesktopBridge()'s fetch patch (which
// reads it synchronously per-request) can attach it, and before the app's
// first API/WS call fires from a mount effect.
await ensureAuthToken()
initDesktopBridge()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
