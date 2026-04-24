import Config from 'react-native-config'

/**
 * Runtime config — pulled from `.env` via `react-native-config` at build time.
 * All reads go through this module so we can unit-test by swapping it out.
 * Do NOT import `react-native-config` anywhere else.
 */
export const ENV = {
  API_URL:
    Config.API_URL && Config.API_URL.length > 0
      ? Config.API_URL
      : 'https://hybrid-vector-api.fly.dev',
  WORKGUARD_API_KEY: Config.WORKGUARD_API_KEY ?? '',
  DYNAMSOFT_LICENSE: Config.DYNAMSOFT_LICENSE ?? '',
  TENANT_ID: Config.TENANT_ID ?? 'workguard-demo',
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
