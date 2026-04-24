import React, { useState, useCallback } from 'react'
import { SafeAreaView, ScrollView, StyleSheet, Alert, View, ActivityIndicator, Text } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { SelfieCapture } from '../components/SelfieCapture'
import { StroopTest } from '../components/StroopTest'
import { NeuralReflex } from '../components/NeuralReflex'
import { GuardResult } from '../components/GuardResult'
import { useWorkguardStore } from '../store/workguardStore'
import { checkInWorker } from '../services/api'
import { ENV } from '../config/env'
import type {
  CheckInPayload,
  CheckInResult,
  ReflexRound,
  RootStackParamList,
  StroopRound,
} from '../types'

type Step = 'selfie' | 'cognitive' | 'submitting' | 'result'

/**
 * Short, daily check-in flow:
 *   1. Selfie → face match vs. the enrolled baseline.
 *   2. One random cognitive test (Stroop or Reflex) to detect
 *      cognitive impairment vs. baseline.
 *   3. Verdict via GuardResult.
 */
export const CheckIn: React.FC = () => {
  const nav = useNavigation<NavigationProp<RootStackParamList>>()
  const worker = useWorkguardStore((s) => s.worker)
  const [step, setStep] = useState<Step>('selfie')
  const [selfie, setSelfie] = useState<string | null>(null)
  const [cognitiveKind] = useState<'stroop' | 'reflex'>(() =>
    Math.random() < 0.5 ? 'stroop' : 'reflex',
  )
  const [verdict, setVerdict] = useState<CheckInResult | null>(null)

  const submit = useCallback(
    async (rounds: StroopRound[] | ReflexRound[]) => {
      if (!worker || !selfie) {
        Alert.alert('Missing data', 'Re-enroll from the home screen.')
        return
      }
      setStep('submitting')
      try {
        const payload: CheckInPayload = {
          tenantId: ENV.TENANT_ID,
          workerId: worker.workerId,
          selfieBase64: selfie,
          cognitiveSample:
            cognitiveKind === 'stroop'
              ? { kind: 'stroop', rounds: rounds as StroopRound[] }
              : { kind: 'reflex', rounds: rounds as ReflexRound[] },
          checkedInAt: new Date().toISOString(),
        }
        const res = await checkInWorker(payload)
        setVerdict(res)
        setStep('result')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Check-in failed.'
        Alert.alert('Check-in error', msg)
        setStep('selfie')
      }
    },
    [cognitiveKind, selfie, worker],
  )

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {step === 'selfie' && (
          <SelfieCapture
            onCaptured={(b64) => {
              setSelfie(b64)
              setStep('cognitive')
            }}
            onError={(msg) => Alert.alert('Selfie error', msg)}
          />
        )}

        {step === 'cognitive' && cognitiveKind === 'stroop' && (
          <StroopTest onComplete={(rounds) => void submit(rounds)} />
        )}

        {step === 'cognitive' && cognitiveKind === 'reflex' && (
          <NeuralReflex onComplete={(rounds) => void submit(rounds)} />
        )}

        {step === 'submitting' && (
          <View style={styles.center}>
            <ActivityIndicator color="#06b6d4" size="large" />
            <Text style={styles.sub}>Verifying…</Text>
          </View>
        )}

        {step === 'result' && verdict && (
          <GuardResult
            verdict={verdict.verdict}
            title={verdict.verified ? `Welcome back, ${verdict.firstName}` : 'Check-in refused'}
            subtitle={
              verdict.trustScore !== undefined
                ? `Trust score: ${(verdict.trustScore * 100).toFixed(1)}%`
                : undefined
            }
            details={[
              { label: 'Similarity', value: `${(verdict.similarity * 100).toFixed(2)}%` },
              { label: 'Test', value: cognitiveKind },
              { label: 'When', value: new Date(verdict.checkedInAt).toLocaleTimeString() },
            ]}
            onDone={() => nav.navigate('Home')}
            doneLabel="Back to home"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050a14' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  sub: { color: '#9aa8bd', marginTop: 16 },
})
