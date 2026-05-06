'use client'

declare const __APP_VERSION__: string

function getAppVersion(): string {
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'
}

export function Nano2Footer() {
  return (
    <footer className="flex items-center justify-center px-4 py-2 bg-card/50 border-t border-white/10 text-xs text-muted-foreground select-none">
      <span>Powered by IoTchange</span>
      <span className="mx-1.5 opacity-30">|</span>
      <span>v{getAppVersion()}</span>
    </footer>
  )
}
