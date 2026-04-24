/**
 * Shared domain types — kept in lockstep with the web WorkGuard
 * (`workguard/src/types/index.ts`) so a worker enrolled on one surface can
 * check in on the other without re-mapping.
 */

export interface WorkerProfile {
  workerId: string
  firstName: string
  lastName: string
  employeeId: string
  jobRole: string
  employerSite: string
  tenantId: string
  rekognitionFaceId?: string
  cognitiveBaseline?: CognitiveBaseline
  enrolledAt?: string
  // MRZ ID verification (Dynamsoft native OCR).
  mrzVerified: boolean
  mrzName?: string
  mrzNationality?: string
  mrzDateOfBirth?: string
  mrzDocumentNumber?: string
  mrzExpiryDate?: string
  mrzDocumentValid?: boolean
}

export interface MrzResult {
  verified: boolean
  name?: string
  nationality?: string
  /** YYMMDD. */
  dateOfBirth?: string
  documentNumber?: string
  /** YYMMDD. */
  expiryDate?: string
  isAdult?: boolean
  mrzValid?: boolean
}

export interface CognitiveBaseline {
  stroopScore: number
  reflexVelocityMs: number
  vocalAccuracy: number
  vocalEmbedding?: number[]
  vocalQuality?: number
  vocalSimilarityThreshold?: number
  reactionTimeMs: number
}

// ─── Cognitive test rounds ───────────────────────────────────────────────

export interface StroopRound {
  round: number
  word: string
  color: string
  /** High-resolution reaction time (performance.now delta). */
  reactionMs: number
  isError: boolean
}

export interface ReflexRound {
  round: number
  signal: 'VALID' | 'NOISE' | 'GHOST'
  response: 'HIT' | 'MISS' | 'FALSE_ALARM' | 'CORRECT_REJECT'
  latencyMs: number
}

export interface ReactionRound {
  round: number
  deltaMs: number
}

export interface VoiceRound {
  round: number
  prompt: string
  transcript: string
  latencyMs: number
  match: boolean
}

// ─── Post-quantum seal ──────────────────────────────────────────────────

export interface PostQuantumSealResult {
  /** Base64 ML-KEM-768 public key. */
  kemPublicKey: string
  /** Base64 ML-KEM-768 ciphertext (encapsulated session secret). */
  kemCiphertext: string
  /** Base64 ML-DSA-65 (Dilithium3) public key. */
  sigPublicKey: string
  /** Base64 ML-DSA-65 signature over the serialized enrollment payload. */
  signature: string
  /** SHA-256 of the payload that was signed (hex). */
  payloadHash: string
  sealedAt: string
}

// ─── API payloads ───────────────────────────────────────────────────────

export interface EnrollmentPayload {
  tenantId: string
  worker: Pick<
    WorkerProfile,
    'firstName' | 'lastName' | 'employeeId' | 'jobRole' | 'employerSite'
  >
  mrz?: MrzResult
  selfieBase64: string
  cognitive: {
    stroop: StroopRound[]
    reflex: ReflexRound[]
    reaction: ReactionRound[]
    voice: VoiceRound[]
  }
  pqSeal: PostQuantumSealResult
  enrolledAt: string
}

export interface EnrollResult {
  success: boolean
  workerId: string
  confidence: number
}

export interface CheckInPayload {
  tenantId: string
  workerId: string
  selfieBase64: string
  cognitiveSample:
    | { kind: 'stroop'; rounds: StroopRound[] }
    | { kind: 'reflex'; rounds: ReflexRound[] }
  checkedInAt: string
}

export interface CheckInResult {
  verified: boolean
  similarity: number
  workerId: string
  firstName: string
  checkedInAt: string
  verdict: 'AUTHORIZED' | 'DEGRADED' | 'BLOCKED'
  trustScore?: number
}

// ─── Navigation ─────────────────────────────────────────────────────────

export type RootStackParamList = {
  Home: undefined
  Enroll: undefined
  CheckIn: undefined
}
