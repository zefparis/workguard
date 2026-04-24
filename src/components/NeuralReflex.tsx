import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { CognitiveCollector } from '../signal-engine/CognitiveCollector'
import { useWorkguardStore } from '../store/workguardStore'
import type { ReflexRound } from '../types'

/**
 * Neural reflex — go / no-go task.
 *  • VALID stimulus → tap (HIT)
 *  • NOISE stimulus → do NOT tap (ignore). Tapping = FALSE_ALARM.
 *  • GHOST slot    → nothing is shown; tapping = FALSE_ALARM.
 *
 *  Measures latency (HIT) and discrimination capacity (correct rejects
 *  vs false alarms). Sub-ms precision via performance.now().
 */

const TOTAL_ROUNDS = 8
const RESPONSE_WINDOW_MS = 1200
const INTER_STIMULUS_MIN = 600
const INTER_STIMULUS_MAX = 1400

type Signal = ReflexRound['signal']

interface Props {
  onComplete: (rounds: ReflexRound[]) => void
}

function pickSignal(): Signal {
  const r = Math.random()
  if (r < 0.55) return 'VALID'
  if (r < 0.85) return 'NOISE'
  return 'GHOST'
}

export const NeuralReflex: React.FC<Props> = ({ onComplete }) => {
  const pushReflex = useWorkguardStore((s) => s.pushReflex)
  const [round, setRound] = useState(0)
  const [currentSignal, setCurrentSignal] = useState<Signal | null>(null)
  const [phase, setPhase] = useState<'idle' | 'stimulus' | 'done'>('idle')
  const stimulusAt = useRef<number>(0)
  const collected = useRef<ReflexRound[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const respondedRef = useRef(false)

  const advance = useCallback(
    (response: ReflexRound['response'], latencyMs: number) => {
      if (respondedRef.current) return
      respondedRef.current = true
      const sig = currentSignal ?? 'GHOST'
      const r: ReflexRound = {
        round: round + 1,
        signal: sig,
        response,
        latencyMs,
      }
      collected.current.push(r)
      pushReflex(r)
      CognitiveCollector.reflex(r)

      if (timerRef.current) clearTimeout(timerRef.current)
      setCurrentSignal(null)
      setPhase('idle')

      if (round + 1 >= TOTAL_ROUNDS) {
        setPhase('done')
        onComplete(collected.current)
        return
      }
      // Random ISI between rounds.
      const isi = INTER_STIMULUS_MIN + Math.random() * (INTER_STIMULUS_MAX - INTER_STIMULUS_MIN)
      timerRef.current = setTimeout(() => setRound((x) => x + 1), isi)
    },
    [currentSignal, onComplete, pushReflex, round],
  )

  // Start each stimulus.
  useEffect(() => {
    if (phase === 'done') return
    respondedRef.current = false
    const sig = pickSignal()
    if (sig === 'GHOST') {
      // Ghost round: no visible stimulus, a correct-reject is the default.
      setCurrentSignal('GHOST')
      setPhase('stimulus')
      stimulusAt.current = performance.now()
      timerRef.current = setTimeout(() => {
        advance('CORRECT_REJECT', performance.now() - stimulusAt.current)
      }, RESPONSE_WINDOW_MS)
    } else {
      setCurrentSignal(sig)
      setPhase('stimulus')
      stimulusAt.current = performance.now()
      timerRef.current = setTimeout(() => {
        const response = sig === 'VALID' ? 'MISS' : 'CORRECT_REJECT'
        advance(response, performance.now() - stimulusAt.current)
      }, RESPONSE_WINDOW_MS)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  const handleTap = useCallback(() => {
    if (phase !== 'stimulus') return
    const latency = performance.now() - stimulusAt.current
    if (currentSignal === 'VALID') advance('HIT', latency)
    else advance('FALSE_ALARM', latency)
  }, [advance, currentSignal, phase])

  return (
    <TouchableOpacity activeOpacity={1} style={styles.container} onPress={handleTap}>
      <Text style={styles.progress}>
        Round {Math.min(round + 1, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
      </Text>
      <Text style={styles.prompt}>
        Tap ONLY when you see the green disc. Ignore red or empty frames.
      </Text>
      <View style={styles.stage}>
        {currentSignal === 'VALID' && <View style={[styles.disc, styles.valid]} />}
        {currentSignal === 'NOISE' && <View style={[styles.disc, styles.noise]} />}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center' },
  progress: { color: '#9aa8bd', fontSize: 14, marginBottom: 8 },
  prompt: { color: '#e8f0ff', fontSize: 16, marginBottom: 32, textAlign: 'center' },
  stage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1220',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  disc: { width: 140, height: 140, borderRadius: 70 },
  valid: { backgroundColor: '#22c55e' },
  noise: { backgroundColor: '#ef4444' },
})
