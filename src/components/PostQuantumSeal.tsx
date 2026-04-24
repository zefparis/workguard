import React, { useEffect, useRef, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { sealEnrollment } from '../services/postQuantum'
import { useWorkguardStore } from '../store/workguardStore'
import type { PostQuantumSealResult } from '../types'

/**
 * Runs the post-quantum seal phase:
 *   1. Serializes the in-memory enrollment payload deterministically.
 *   2. Generates ML-KEM-768 + ML-DSA-65 keypairs.
 *   3. Signs the payload hash.
 *   4. Stores private keys in the Keychain/Keystore via react-native-keychain.
 *   5. Hands the seal up to the parent screen so it can be shipped with
 *      the enrollment request.
 *
 * Pure stateless effect-driven component — renders a progress indicator
 * during keygen (~200-500 ms on mid-range devices).
 */

interface Props {
  onSealed: (seal: PostQuantumSealResult) => void
  onError: (msg: string) => void
}

function encodeEnrollmentBytes(payload: unknown): Uint8Array {
  // Deterministic JSON serialization — sort keys at every depth so the
  // hash is reproducible by any backend that canonicalizes similarly.
  const s = stableStringify(payload)
  const arr = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i) & 0xff
  return arr
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']'
  const keys = Object.keys(v as Record<string, unknown>).sort()
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + stableStringify((v as Record<string, unknown>)[k]))
      .join(',') +
    '}'
  )
}

export const PostQuantumSeal: React.FC<Props> = ({ onSealed, onError }) => {
  const [err, setErr] = useState<string | null>(null)
  const state = useWorkguardStore()
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const payload = {
      mrz: state.mrzResult,
      selfiePresent: Boolean(state.selfieBase64),
      cognitive: {
        stroop: state.stroopRounds,
        reflex: state.reflexRounds,
        reaction: state.reactionRounds,
        voice: state.voiceRounds,
      },
      sealedAt: new Date().toISOString(),
    }
    const bytes = encodeEnrollmentBytes(payload)

    sealEnrollment(bytes)
      .then((seal) => {
        onSealed(seal)
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Post-quantum sealing failed.'
        setErr(msg)
        onError(msg)
      })
    // Deliberately only runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#06b6d4" />
      <Text style={styles.title}>Post-quantum sealing…</Text>
      <Text style={styles.sub}>
        ML-KEM-768 + ML-DSA-65 keys generated on-device. Private keys stored in the secure enclave.
      </Text>
      {err && <Text style={styles.err}>{err}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 40, alignItems: 'center' },
  title: { color: '#e8f0ff', fontSize: 18, fontWeight: '700', marginTop: 20 },
  sub: { color: '#9aa8bd', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  err: { color: '#ef4444', marginTop: 16, textAlign: 'center' },
})
