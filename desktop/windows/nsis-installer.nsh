; Custom NSIS Installer configuration for Smoke Monkey Canvas Desktop
!macro customHeader
  !system "echo 'Configuring Smoke Monkey Canvas installer...'"
!macroend

!macro customInit
  ; Check if server port 3333 is already running or previous installation exists
!macroend

!macro customInstall
  ; Create Desktop and Start Menu Shortcuts
  CreateShortCut "$DESKTOP\Smoke Monkey Canvas.lnk" "$INSTDIR\smoke-monkey-canvas-desktop.exe" "" "$INSTDIR\smoke-monkey-canvas-desktop.exe" 0
!macroend

!macro customUnInstall
  Delete "$DESKTOP\Smoke Monkey Canvas.lnk"
!macroend
