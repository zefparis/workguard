import { SignalBus } from './SignalBus'
import type { ReactionRound, ReflexRound, StroopRound } from '../types'

/**
 * Cognitive collector — thin wrapper that narrows the SignalBus API for
 * the three cognitive tests. Every round uses `performance.now()` for
 * sub-millisecond precision (per project policy — NO `Date.now()` for
 * timing).
 */

export const CognitiveCollector = {
  stroop(round: StroopRound): void {
    SignalBus.emit('stroop', round)
  },
  reflex(round: ReflexRound): void {
    SignalBus.emit('reflex', round)
  },
  reaction(round: ReactionRound): void {
    SignalBus.emit('reaction', round)
  },
}
