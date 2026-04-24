import { AppState, type AppStateStatus } from 'react-native'
import { SignalBus } from './SignalBus'

/**
 * Behavioral signals — coarse, ambient telemetry about how the user
 * navigates the app: foreground/background transitions, screen dwells,
 * navigation events. Mirrors the web version's BehavioralCollector.
 *
 * Deliberately zero PII: the backend `workguard_signals` table is keyed
 * on channel + source, no identifiers are shipped.
 */

let lastState: AppStateStatus = AppState.currentState
let subscription: { remove: () => void } | null = null
let screenEnteredAt = performance.now()

export function startBehavioralCollector(): void {
  if (subscription) return
  subscription = AppState.addEventListener('change', (next) => {
    SignalBus.emit('app_state', {
      from: lastState,
      to: next,
    })
    lastState = next
  })
}

export function stopBehavioralCollector(): void {
  subscription?.remove()
  subscription = null
}

export function markScreenEnter(screen: string): void {
  screenEnteredAt = performance.now()
  SignalBus.emit('screen_enter', { screen })
}

export function markScreenExit(screen: string): void {
  const dwellMs = performance.now() - screenEnteredAt
  SignalBus.emit('screen_exit', { screen, dwellMs })
}
