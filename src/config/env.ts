/**
 * Runtime config — pulled from `.env` via `react-native-config` at build time.
 * All reads go through this module so we can unit-test by swapping it out.
 * Do NOT import `react-native-config` anywhere else.
 *
 * `react-native-config` can crash at module-load time under RN 0.79 new-arch
 * when the native module registration has not happened yet (e.g. the first
 * JS eval during dev reload). We therefore load it defensively so a missing
 * native side degrades to defaults instead of a red-screen.
 */

type RNConfig = Record<string, string | undefined>

function loadNativeConfig(): RNConfig {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-config')
    const cfg = (mod && (mod.default ?? mod)) as RNConfig | null | undefined
    console.log('[env] Raw config keys:', Object.keys(cfg ?? {}))
    return cfg ?? {}
  } catch (e) {
    console.warn('[env] Failed to load native config:', e)
    return {}
  }
}

const Config = loadNativeConfig()

function str(value: string | undefined, fallback: string): string {
  return value && value.length > 0 ? value : fallback
}

export const ENV = {
  API_URL: str(Config.API_URL, 'https://hybrid-vector-api.fly.dev'),
  WORKGUARD_API_KEY: str(Config.WORKGUARD_API_KEY, ''),
  DYNAMSOFT_LICENSE: str(Config.DYNAMSOFT_LICENSE, ''),
  TENANT_ID: str(Config.TENANT_ID, 'workguard-demo'),
} as const

export function assertEnv(): void {
  const missing: string[] = []
  if (!ENV.WORKGUARD_API_KEY) missing.push('WORKGUARD_API_KEY')
  if (!ENV.DYNAMSOFT_LICENSE) missing.push('DYNAMSOFT_LICENSE')
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[env] missing: ${missing.join(', ')}`)
  }
}
