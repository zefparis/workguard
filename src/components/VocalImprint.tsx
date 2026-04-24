import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import Voice, {
  type SpeechErrorEvent,
  type SpeechResultsEvent,
} from '@react-native-voice/voice'
import { VoiceCollector } from '../signal-engine/VoiceCollector'
import { useWorkguardStore } from '../store/workguardStore'
import type { VoiceRound } from '../types'

/**
 * Vocal stroop — audio counterpart to the visual Stroop task.
 *  • Display a color word rendered in a different ink.
 *  • Subject must SPEAK the ink color (not read the word aloud).
 *  • @react-native-voice/voice streams a recognized transcript; we match
 *    it against the expected ink color (case/diacritic-insensitive).
 */

const ROUNDS = [
  { word: 'ROUGE', ink: 'VERT', inkHex: '#22c55e', expected: 'VERT' },
  { word: 'BLEU', ink: 'ROUGE', inkHex: '#ef4444', expected: 'ROUGE' },
  { word: 'JAUNE', ink: 'BLEU', inkHex: '#3b82f6', expected: 'BLEU' },
  { word: 'VERT', ink: 'JAUNE', inkHex: '#facc15', expected: 'JAUNE' },
] as const

interface Props {
  onComplete: (rounds: VoiceRound[]) => void
  onError: (msg: string) => void
}

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
}

export const VocalImprint: React.FC<Props> = ({ onComplete, onError }) => {
  const pushVoice = useWorkguardStore((s) => s.pushVoice)
  const [roundIdx, setRoundIdx] = useState(0)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const startedAt = useRef<number>(0)
  const collected = useRef<VoiceRound[]>([])

  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        setTranscript(e.value[0])
      }
    }
    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      VoiceCollector.error({ stage: 'parse', message: e.error?.message ?? 'unknown' })
      onError(e.error?.message ?? 'Speech recognition failed.')
      setListening(false)
    }
    return () => {
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {})
    }
  }, [onError])

  const startListening = useCallback(async () => {
    setTranscript('')
    startedAt.current = performance.now()
    try {
      await Voice.start('fr-FR')
      setListening(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start mic.'
      VoiceCollector.error({ stage: 'start', message: msg })
      onError(msg)
    }
  }, [onError])

  const stopAndScore = useCallback(async () => {
    try {
      await Voice.stop()
    } catch {
      /* ignore */
    }
    setListening(false)
    const latencyMs = performance.now() - startedAt.current
    const expected = ROUNDS[roundIdx].expected
    const match = norm(transcript).includes(norm(expected))
    const r: VoiceRound = {
      round: roundIdx + 1,
      prompt: `Say the INK color: ${expected}`,
      transcript,
      latencyMs,
      match,
    }
    collected.current.push(r)
    pushVoice(r)
    VoiceCollector.round(r)

    if (roundIdx + 1 >= ROUNDS.length) {
      onComplete(collected.current)
      return
    }
    setRoundIdx((x) => x + 1)
  }, [onComplete, pushVoice, roundIdx, transcript])

  const current = ROUNDS[roundIdx]

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        Round {roundIdx + 1} / {ROUNDS.length}
      </Text>
      <Text style={styles.prompt}>Say the INK color aloud — not the word.</Text>

      <View style={styles.stimulusBox}>
        <Text style={[styles.stimulus, { color: current.inkHex }]}>{current.word}</Text>
      </View>

      <Text style={styles.transcript}>{transcript || '…'}</Text>

      {listening ? (
        <TouchableOpacity style={styles.primary} onPress={stopAndScore}>
          <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.primaryText}>Stop & score</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.primary} onPress={() => void startListening()}>
          <Text style={styles.primaryText}>Tap and speak</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center' },
  progress: { color: '#9aa8bd', fontSize: 14, marginBottom: 8 },
  prompt: { color: '#e8f0ff', fontSize: 16, marginBottom: 24, textAlign: 'center' },
  stimulusBox: {
    width: 260,
    height: 120,
    backgroundColor: '#0b1220',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  stimulus: { fontSize: 44, fontWeight: '800', letterSpacing: 2 },
  transcript: {
    color: '#94a3b8',
    fontSize: 16,
    marginBottom: 24,
    minHeight: 24,
  },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#06b6d4',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 240,
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
