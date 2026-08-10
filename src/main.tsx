import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.tsx'
import './index.css'

function lockViewportGestures() {
  const block = (event: Event) => {
    event.preventDefault()
  }

  // iOS Safari / WKWebView pinch-zoom & double-tap zoom
  document.addEventListener('gesturestart', block, { passive: false })
  document.addEventListener('gesturechange', block, { passive: false })
  document.addEventListener('gestureend', block, { passive: false })

  let lastTouchEnd = 0
  document.addEventListener(
    'touchend',
    (event) => {
      const now = Date.now()
      if (now - lastTouchEnd <= 300) event.preventDefault()
      lastTouchEnd = now
    },
    { passive: false },
  )
}

async function bootstrapNative() {
  if (!Capacitor.isNativePlatform()) return

  const [{ StatusBar, Style }, { Keyboard }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/keyboard'),
  ])

  await StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined)
  await Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(
    () => undefined,
  )
}

lockViewportGestures()
void bootstrapNative()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
