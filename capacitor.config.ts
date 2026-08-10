import type { CapacitorConfig } from '@capacitor/cli'

const liveReload = process.env.CAPACITOR_LIVE_RELOAD === '1'
const liveHost = process.env.CAPACITOR_LIVE_HOST ?? 'localhost'
const livePort = process.env.CAPACITOR_LIVE_PORT ?? '5173'

const config: CapacitorConfig = {
  appId: 'com.nvroulette.app',
  appName: 'NV Roulette',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    ...(liveReload
      ? {
          url: `http://${liveHost}:${livePort}`,
          cleartext: true,
        }
      : {}),
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
    },
    Keyboard: {
      resize: 'body',
    },
    StatusBar: {
      style: 'DARK',
    },
  },
}

export default config
