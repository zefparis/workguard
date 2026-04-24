import React, { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { CognitiveCollector } from '../signal-engine/CognitiveCollector'
import { useWorkguardStore } from '../store/workguardStore'
import type { StroopRound } from '../types'

/**
 * Stroop task — classic cognitive interference test.
 *  • Display a color word (e.g. "ROUGE") rendered in a different ink color.
 *  • The subject must select the INK color, not read the word.
 *  • Sub-ms reaction time via `performance.now()` (per project policy).
 */

const COLORS = [
  { name: 'ROUGE', hex: '#ef4444' },
  { name: 'VERT', hex: '#22c55e' },
  { name: 'BLEU', hex: '#3b82f6' },
  { name: 'JAUNE', hex: '#facc15' },
] as const

const TOTAL_ROUNDS = 10

interface Props {
  onComplete: (rounds: StroopRound[]) => void
}

function pickRound(): { word: (typeof COLORS)[number]; ink: (typeof COLORS)[number] } {
  const word = COLORS[Math.floor(Math.random() * COLORS.length)]
  let ink = word
  // Force incongruent pairing ~70% of the time.
  if (Math.random() < 0.7) {
    while (ink.name === word.name) {
      ink = COLORS[Math.floor(Math.random() * COLORS.length)]
    }
  }
  return { word, ink }
}

export const StroopTest: React.FC<Props> = ({ onComplete }) => {
  const pushStroop = useWorkguardStore((s) => s.pushStroop)
  const [round, setRound] = useState(0)
  const [stimulus, setStimulus] = useState(pickRound)
  const startedAt = useRef<number>(performance.now())
  const collected = useRef<StroopRound[]>([])

  useEffect(() => {
    startedAt.current = performance.now()
  }, [round])

  const handlePick = useCallback(
    (choice: (typeof COLORS)[number]) => {
      const reactionMs = performance.now() - startedAt.current
      const isError = choice.name !== stimulus.ink.name
      const r: StroopRound = {
        round: round + 1,
        word: stimulus.word.name,
        color: stimulus.ink.name,
        reactionMs,
        isError,
      }
      collected.current.push(r)
      pushStroop(r)
      CognitiveCollector.stroop(r)

      if (round + 1 >= TOTAL_ROUNDS) {
        onComplete(collected.current)
        return
      }
      setRound((x) => x + 1)
      setStimulus(pickRound())
    },
    [onComplete, pushStroop, round, stimulus.ink.name, stimulus.word.name],
  )

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        Round {round + 1} / {TOTAL_ROUNDS}
      </Text>
      <Text style={styles.prompt}>Tap the INK color, not the word.</Text>

      <View style={styles.stimulusBox}>
        <Text style={[styles.stimulus, { color: stimulus.ink.hex }]}>{stimulus.word.name}</Text>
      </View>

      <View style={styles.row}>
        {COLORS.map((c) => (
          <TouchableOpacity
            key={c.name}
            style={[styles.swatch, { backgroundColor: c.hex }]}
            onPress={() => handlePick(c)}
          >
            <Text style={styles.swatchText}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  progress: { color: '#9aa8bd', fontSize: 14, marginBottom: 8 },
  prompt: { color: '#e8f0ff', fontSize: 16, marginBottom: 32, textAlign: 'center' },
  stimulusBox: {
    width: 260,
    height: 120,
    backgroundColor: '#0b1220',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  stimulus: { fontSize: 44, fontWeight: '800', letterSpacing: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  swatch: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  swatchText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
