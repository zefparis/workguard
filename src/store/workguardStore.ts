import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { MMKV } from 'react-native-mmkv'
import type {
  MrzResult,
  PostQuantumSealResult,
  ReactionRound,
  ReflexRound,
  StroopRound,
  VoiceRound,
  WorkerProfile,
} from '../types'

/**
 * App-wide persistent store, shape-compatible with the web WorkGuard store
 * so admin dashboards can reason about mobile + web enrollments uniformly.
 *
 * Persistence is backed by MMKV — 30x faster than AsyncStorage on RN,
 * synchronous, and writes land on disk before the next render tick.
 */

const mmkv = new MMKV({ id: 'workguard-rn' })

const mmkvStorage: StateStorage = {
  getItem: (name) => mmkv.getString(name) ?? null,
  setItem: (name, value) => {
    mmkv.set(name, value)
  },
  removeItem: (name) => {
    mmkv.delete(name)
  },
}

export type EnrollmentStep =
  | 'mrz'
  | 'selfie'
  | 'stroop'
  | 'reflex'
  | 'reaction'
  | 'voice'
  | 'pq-seal'
  | 'done'

interface WorkguardState {
  // Worker identity (after successful enrollment)
  worker: WorkerProfile | null

  // In-flight enrollment state
  enrollmentStep: EnrollmentStep
  mrzResult: MrzResult | null
  selfieBase64: string | null
  stroopRounds: StroopRound[]
  reflexRounds: ReflexRound[]
  reactionRounds: ReactionRound[]
  voiceRounds: VoiceRound[]
  pqSeal: PostQuantumSealResult | null

  // Actions
  setWorker: (w: WorkerProfile | null) => void
  setEnrollmentStep: (s: EnrollmentStep) => void
  setMrzResult: (r: MrzResult | null) => void
  setSelfie: (b64: string | null) => void
  pushStroop: (r: StroopRound) => void
  pushReflex: (r: ReflexRound) => void
  pushReaction: (r: ReactionRound) => void
  pushVoice: (r: VoiceRound) => void
  setPqSeal: (s: PostQuantumSealResult | null) => void
  resetEnrollment: () => void
  reset: () => void
}

const INITIAL: Omit<
  WorkguardState,
  | 'setWorker'
  | 'setEnrollmentStep'
  | 'setMrzResult'
  | 'setSelfie'
  | 'pushStroop'
  | 'pushReflex'
  | 'pushReaction'
  | 'pushVoice'
  | 'setPqSeal'
  | 'resetEnrollment'
  | 'reset'
> = {
  worker: null,
  enrollmentStep: 'mrz',
  mrzResult: null,
  selfieBase64: null,
  stroopRounds: [],
  reflexRounds: [],
  reactionRounds: [],
  voiceRounds: [],
  pqSeal: null,
}

export const useWorkguardStore = create<WorkguardState>()(
  persist(
    (set) => ({
      ...INITIAL,
      setWorker: (worker) => set({ worker }),
      setEnrollmentStep: (enrollmentStep) => set({ enrollmentStep }),
      setMrzResult: (mrzResult) => set({ mrzResult }),
      setSelfie: (selfieBase64) => set({ selfieBase64 }),
      pushStroop: (r) => set((s) => ({ stroopRounds: [...s.stroopRounds, r] })),
      pushReflex: (r) => set((s) => ({ reflexRounds: [...s.reflexRounds, r] })),
      pushReaction: (r) => set((s) => ({ reactionRounds: [...s.reactionRounds, r] })),
      pushVoice: (r) => set((s) => ({ voiceRounds: [...s.voiceRounds, r] })),
      setPqSeal: (pqSeal) => set({ pqSeal }),
      resetEnrollment: () =>
        set({
          enrollmentStep: 'mrz',
          mrzResult: null,
          selfieBase64: null,
          stroopRounds: [],
          reflexRounds: [],
          reactionRounds: [],
          voiceRounds: [],
          pqSeal: null,
        }),
      reset: () => set({ ...INITIAL }),
    }),
    {
      name: 'workguard-rn-store',
      storage: createJSONStorage(() => mmkvStorage),
      // Don't persist in-progress enrollment buffers; only finalized worker.
      partialize: (state) => ({ worker: state.worker }),
    },
  ),
)
