import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { CognitiveCollector } from '../signal-engine/CognitiveCollector'
import { useWorkguardStore } from '../store/workguardStore'
import type { ReactionRound } from '../types'

/**
 * Pure simple reaction time — wait for the green flash, tap as fast as
 * possible. Five rounds, inter-stimulus interval randomized to defeat
 * anticipation strategies.
 */

const TOTAL_ROUNDS = 5

interface Props {
  onComplete: (rounds: ReactionRound[]) => void
}

type Phase = 'ready' | 'waiting' | 'go' | 'too-early'

export const ReactionTime: React.FC<Props> = ({ onComplete }) => {
  const pushReaction = useWorkguardStore((s) => s.pushReaction)
  const [round, setRound] = useState(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const [feedback, setFeedback] = useState<string>('')
  const goAt = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const collected = useRef<ReactionRound[]>([])

  const armRound = useCallback(() => {
    setPhase('waiting')
    setFeedback('')
    const delay = 1200 + Math.random() * 2400
    timerRef.current = setTimeout(() => {
      goAt.current = performance.now()
      setPhase('go')
    }, delay)
  }, [])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const finishRound = useCallback(
    (deltaMs: number) => {
      const r: ReactionRound = { round: round + 1, deltaMs }
      collected.current.push(r)
      pushReaction(r)
      CognitiveCollector.reaction(r)
      setFeedback(`${deltaMs.toFixed(0)} ms`)
      if (round + 1 >= TOTAL_ROUNDS) {
        onComplete(collected.current)
        return
      }
      setRound((x) => x + 1)
      setPhase('ready')
    },
    [onComplete, pushReaction, round],
  )

  const handleTap = useCallback(() => {
    if (phase === 'ready') {
      armRound()
      return
    }
    if (phase === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current)
      setPhase('too-early')
      setFeedback('Too early — tap to retry.')
      return
    }
    if (phase === 'go') {
      finishRound(performance.now() - goAt.current)
      return
    }
    if (phase === 'too-early') {
      setPhase('ready')
      setFeedback('')
    }
  }, [armRound, finishRound, phase])

  const bg =
    phase === 'go' ? '#22c55e' : phase === 'too-early' ? '#ef4444' : '#0b1220'

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        Round {round + 1} / {TOTAL_ROUNDS}
      </Text>
      <Text style={styles.prompt}>
        Tap when the screen turns GREEN. Don't jump the gun.
      </Text>

      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTap}
        style={[styles.stage, { backgroundColor: bg }]}
      >
        <Text style={styles.stageText}>
          {phase === 'ready' && 'Tap to start'}
          {phase === 'waiting' && 'Wait…'}
          {phase === 'go' && 'TAP!'}
          {phase === 'too-early' && 'Too early'}
        </Text>
      </TouchableOpacity>

      {feedback.length > 0 && <Text style={styles.feedback}>{feedback}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center' },
  progress: { color: '#9aa8bd', fontSize: 14, marginBottom: 8 },
  prompt: { color: '#e8f0ff', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  stage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  stageText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  feedback: { color: '#06b6d4', fontSize: 16, marginTop: 16 },
})
