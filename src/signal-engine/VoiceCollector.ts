import { SignalBus } from './SignalBus'
import type { VoiceRound } from '../types'

/**
 * Voice biometrics telemetry — per-round phonetic timing, hesitation
 * markers and transcript-match flags. Raw audio is never shipped.
 */

export const VoiceCollector = {
  round(r: VoiceRound): void {
    SignalBus.emit('voice', r)
  },
  error(r: { stage: 'start' | 'stop' | 'parse'; message: string }): void {
    SignalBus.emit('voice_error', r)
  },
}
