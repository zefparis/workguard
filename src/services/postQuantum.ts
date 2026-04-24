import { MlKem768 } from 'mlkem'
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa'
import { sha256 } from '@noble/hashes/sha2'
import { randomBytes } from '@noble/post-quantum/utils'
import * as Keychain from 'react-native-keychain'
import type { PostQuantumSealResult } from '../types'

/**
 * Post-quantum sealing layer — used at the end of the enrollment flow to
 * produce a cryptographically signed, forward-secure attestation of the
 * worker's baseline biometrics + cognitive profile.
 *
 * Algorithms:
 *  • ML-KEM-768 (Kyber768, NIST FIPS 203) — key encapsulation.
 *  • ML-DSA-65  (Dilithium3, NIST FIPS 204) — digital signatures.
 *
 * Private keys never leave the device: they are stored in the platform
 * secure enclave (iOS Keychain / Android Keystore) via `react-native-keychain`.
 */

const KEYCHAIN_SERVICE_KEM = 'workguard.pq.kem.sk'
const KEYCHAIN_SERVICE_SIG = 'workguard.pq.sig.sk'

function toB64(bytes: Uint8Array): string {
  // Pure JS base64 — avoids depending on Buffer polyfills.
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const g = globalThis as unknown as { btoa?: (s: string) => string }
  return g.btoa ? g.btoa(binary) : fallbackB64Encode(binary)
}

function toHex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0')
  }
  return out
}

// ASCII-only base64 fallback in case `btoa` is unavailable (older Hermes).
function fallbackB64Encode(bin: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let out = ''
  let i = 0
  while (i < bin.length) {
    const a = bin.charCodeAt(i++)
    const b = i < bin.length ? bin.charCodeAt(i++) : Number.NaN
    const c = i < bin.length ? bin.charCodeAt(i++) : Number.NaN
    const b1 = a >> 2
    const b2 = ((a & 3) << 4) | ((Number.isNaN(b) ? 0 : b) >> 4)
    const b3 = Number.isNaN(b)
      ? 64
      : (((b & 15) << 2) | ((Number.isNaN(c) ? 0 : c) >> 6))
    const b4 = Number.isNaN(c) ? 64 : c & 63
    out += chars[b1] + chars[b2] + (b3 === 64 ? '=' : chars[b3]) + (b4 === 64 ? '=' : chars[b4])
  }
  return out
}

async function storeSecret(service: string, secret: Uint8Array): Promise<void> {
  await Keychain.setGenericPassword('workguard', toB64(secret), {
    service,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  })
}

/**
 * Sign + encapsulate a serialized enrollment payload.
 * The caller provides the exact bytes that the backend will hash and verify.
 */
export async function sealEnrollment(
  payloadBytes: Uint8Array,
): Promise<PostQuantumSealResult> {
  // 1. ML-KEM-768 keygen + encapsulation.
  const kem = new MlKem768()
  const [kemPk, kemSk] = await kem.generateKeyPair()
  const [kemCt /* sharedSecret */] = await kem.encap(kemPk)

  // 2. ML-DSA-65 keygen + signature over payload hash.
  //    randomBytes from @noble/post-quantum wraps a cryptographically-secure
  //    RNG (Hermes' globalThis.crypto on RN, Web Crypto elsewhere).
  const sigSeed = randomBytes(32)
  const sigKp = ml_dsa65.keygen(sigSeed)
  const payloadHash = sha256(payloadBytes)
  const signature = ml_dsa65.sign(sigKp.secretKey, payloadHash)

  // 3. Persist secrets to the device's secure enclave.
  await Promise.all([
    storeSecret(KEYCHAIN_SERVICE_KEM, kemSk),
    storeSecret(KEYCHAIN_SERVICE_SIG, sigKp.secretKey),
  ])

  return {
    kemPublicKey: toB64(kemPk),
    kemCiphertext: toB64(kemCt),
    sigPublicKey: toB64(sigKp.publicKey),
    signature: toB64(signature),
    payloadHash: toHex(payloadHash),
    sealedAt: new Date().toISOString(),
  }
}

/**
 * Produce a fresh ML-DSA-65 signature at check-in time using the private key
 * stored in the Keychain. If no key is present (fresh install) the caller
 * should fall back to re-enrollment.
 */
export async function signWithStoredKey(
  payloadBytes: Uint8Array,
): Promise<{ signature: string; payloadHash: string } | null> {
  const creds = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE_SIG })
  if (!creds) return null
  const b64 = creds.password
  // decode base64 → Uint8Array
  const g = globalThis as unknown as { atob?: (s: string) => string }
  const binary = g.atob ? g.atob(b64) : fallbackB64Decode(b64)
  const sk = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) sk[i] = binary.charCodeAt(i)
  const payloadHash = sha256(payloadBytes)
  const signature = ml_dsa65.sign(sk, payloadHash)
  return { signature: toB64(signature), payloadHash: toHex(payloadHash) }
}

function fallbackB64Decode(b64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const lookup: Record<string, number> = {}
  for (let i = 0; i < chars.length; i++) lookup[chars[i]] = i
  const clean = b64.replace(/=+$/, '')
  let out = ''
  let buffer = 0
  let bits = 0
  for (let i = 0; i < clean.length; i++) {
    const v = lookup[clean[i]]
    if (v === undefined) continue
    buffer = (buffer << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out += String.fromCharCode((buffer >> bits) & 0xff)
    }
  }
  return out
}
