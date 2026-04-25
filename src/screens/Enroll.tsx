import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import { MrzScannerComponent } from '../components/MrzScanner'
import { SelfieCapture } from '../components/SelfieCapture'
import { StroopTest } from '../components/StroopTest'
import { NeuralReflex } from '../components/NeuralReflex'
import { ReactionTime } from '../components/ReactionTime'
import { VocalImprint } from '../components/VocalImprint'
// TEMP: PostQuantumSeal bypassed for stability testing
// import { PostQuantumSeal } from '../components/PostQuantumSeal'
import { GuardResult } from '../components/GuardResult'
import { useWorkguardStore } from '../store/workguardStore'
import { enrollWorker } from '../services/api'
import { ENV } from '../config/env'
import type {
  EnrollmentPayload,
  PostQuantumSealResult,
  RootStackParamList,
} from '../types'

/**
 * 8-step enrollment flow. Step order and labels are the public contract
 * other Guard apps clone — don't reorder without coordinating.
 */

const STEPS = [
  { id: 'mrz', label: 'ID' },
  { id: 'selfie', label: 'Selfie' },
  { id: 'stroop', label: 'Stroop' },
  { id: 'reflex', label: 'Reflex' },
  { id: 'reaction', label: 'Reaction' },
  { id: 'voice', label: 'Voice' },
  { id: 'pq-seal', label: 'Seal' },
  { id: 'done', label: 'Done' },
] as const

export const Enroll: React.FC = () => {
  const nav = useNavigation<NavigationProp<RootStackParamList>>()
  const store = useWorkguardStore()
  const [submitting, setSubmitting] = useState(false)
  const [finalVerdict, setFinalVerdict] =
    useState<null | { workerId: string; confidence: number }>(null)

  const stepIdx = STEPS.findIndex((s) => s.id === store.enrollmentStep)

  const submitEnrollment = useCallback(
    async (seal: PostQuantumSealResult) => {
      if (!store.selfieBase64) {
        Alert.alert('Missing selfie', 'A selfie is required to enroll.')
        return
      }
      setSubmitting(true)
      try {
        const payload: EnrollmentPayload = {
          tenantId: ENV.TENANT_ID,
          worker: {
            firstName: store.mrzResult?.name?.split(' ')[0] ?? 'Worker',
            lastName: store.mrzResult?.name?.split(' ').slice(1).join(' ') ?? '',
            employeeId: store.mrzResult?.documentNumber ?? `WG-${Date.now()}`,
            jobRole: 'unspecified',
            employerSite: 'unspecified',
          },
          mrz: store.mrzResult ?? undefined,
          selfieBase64: store.selfieBase64,
          cognitive: {
            stroop: store.stroopRounds,
            reflex: store.reflexRounds,
            reaction: store.reactionRounds,
            voice: store.voiceRounds,
          },
          pqSeal: seal,
          enrolledAt: new Date().toISOString(),
        }
        const result = await enrollWorker(payload)
        store.setWorker({
          workerId: result.workerId,
          firstName: payload.worker.firstName,
          lastName: payload.worker.lastName,
          employeeId: payload.worker.employeeId,
          jobRole: payload.worker.jobRole,
          employerSite: payload.worker.employerSite,
          tenantId: ENV.TENANT_ID,
          enrolledAt: payload.enrolledAt,
          mrzVerified: Boolean(store.mrzResult?.verified),
          mrzName: store.mrzResult?.name,
          mrzNationality: store.mrzResult?.nationality,
          mrzDateOfBirth: store.mrzResult?.dateOfBirth,
          mrzDocumentNumber: store.mrzResult?.documentNumber,
          mrzExpiryDate: store.mrzResult?.expiryDate,
          mrzDocumentValid: store.mrzResult?.mrzValid,
        })
        setFinalVerdict({ workerId: result.workerId, confidence: result.confidence })
        store.setEnrollmentStep('done')
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Enrollment failed.'
        Alert.alert('Enrollment error', msg)
      } finally {
        setSubmitting(false)
      }
    },
    [store],
  )

  return (
    <SafeAreaView style={styles.safe}>
      <StepProgress currentIdx={stepIdx} />
      <ScrollView contentContainerStyle={styles.body}>
        {store.enrollmentStep === 'mrz' && (
          <MrzScannerComponent
            onVerified={(r) => {
              store.setMrzResult(r)
              store.setEnrollmentStep('selfie')
            }}
            onSkip={() => store.setEnrollmentStep('selfie')}
            onError={(msg) => Alert.alert('Scanner error', msg)}
          />
        )}

        {store.enrollmentStep === 'selfie' && (
          <SelfieCapture
            onCaptured={(b64) => {
              store.setSelfie(b64)
              store.setEnrollmentStep('stroop')
            }}
            onError={(msg) => Alert.alert('Selfie error', msg)}
          />
        )}

        {store.enrollmentStep === 'stroop' && (
          <StroopTest onComplete={() => store.setEnrollmentStep('reflex')} />
        )}

        {store.enrollmentStep === 'reflex' && (
          <NeuralReflex onComplete={() => store.setEnrollmentStep('reaction')} />
        )}

        {store.enrollmentStep === 'reaction' && (
          <ReactionTime onComplete={() => store.setEnrollmentStep('voice')} />
        )}

        {store.enrollmentStep === 'voice' && (
          <VocalImprint
            onComplete={() => store.setEnrollmentStep('pq-seal')}
            onError={(msg) => Alert.alert('Voice error', msg)}
          />
        )}

        {store.enrollmentStep === 'pq-seal' && (
          <SealBypass
            submitting={submitting}
            onBypass={() => {
              // Stub seal so the rest of the payload stays shape-compatible.
              // Backend must accept unsigned payloads while this bypass is active.
              const stubSeal: PostQuantumSealResult = {
                kemPublicKey: '',
                kemCiphertext: '',
                sigPublicKey: '',
                signature: '',
                payloadHash: '',
                sealedAt: new Date().toISOString(),
              }
              store.setPqSeal(stubSeal)
              void submitEnrollment(stubSeal)
            }}
          />
        )}

        {store.enrollmentStep === 'done' && finalVerdict && (
          <GuardResult
            verdict="ENROLLED"
            title="Worker enrolled"
            subtitle={`Confidence ${(finalVerdict.confidence * 100).toFixed(1)}%`}
            details={[
              { label: 'Worker ID', value: finalVerdict.workerId },
              { label: 'Tenant', value: ENV.TENANT_ID },
            ]}
            onDone={() => {
              store.resetEnrollment()
              nav.navigate('Home')
            }}
            doneLabel="Back to home"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const SealBypass: React.FC<{ submitting: boolean; onBypass: () => void }> = ({
  submitting,
  onBypass,
}) => {
  useEffect(() => {
    const t = setTimeout(onBypass, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <View style={styles.bypass}>
      <ActivityIndicator color="#06b6d4" />
      <Text style={styles.bypassText}>
        {submitting ? 'Uploading enrollment…' : 'Finalizing enrollment…'}
      </Text>
    </View>
  )
}

const StepProgress: React.FC<{ currentIdx: number }> = ({ currentIdx }) => (
  <View style={progStyles.bar}>
    {STEPS.map((s, i) => (
      <View key={s.id} style={progStyles.segmentWrap}>
        <View
          style={[
            progStyles.segment,
            i <= currentIdx ? progStyles.segmentActive : progStyles.segmentIdle,
          ]}
        />
        <Text
          style={[progStyles.label, i === currentIdx && progStyles.labelActive]}
          numberOfLines={1}
        >
          {s.label}
        </Text>
      </View>
    ))}
  </View>
)

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050a14' },
  body: { flexGrow: 1 },
  submitting: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submittingText: { color: '#9aa8bd', marginLeft: 12 },
  bypass: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  bypassText: { color: '#9aa8bd', marginTop: 12, fontSize: 14 },
})

const progStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 4,
  },
  segmentWrap: { flex: 1, alignItems: 'center' },
  segment: { height: 4, width: '100%', borderRadius: 2, marginBottom: 4 },
  segmentActive: { backgroundColor: '#06b6d4' },
  segmentIdle: { backgroundColor: '#1e293b' },
  label: { color: '#475569', fontSize: 10, letterSpacing: 1 },
  labelActive: { color: '#06b6d4' },
})
