import { memo, useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { SelfieCapture } from '../components/SelfieCapture'
import { verifyWorker } from '../services/api'
import { useWorkGuardStore } from '../store/workguardStore'
import { useVoiceBiometrics } from '../hooks/useVoiceBiometrics'

type Step = 'identity' | 'selfie' | 'verifying' | 'voice' | 'success' | 'failed'

type IdentityFormProps = {
  firstName: string
  lastName: string
  onSubmit: (e: FormEvent) => void
  onFirstNameChange: (e: ChangeEvent<HTMLInputElement>) => void
  onLastNameChange: (e: ChangeEvent<HTMLInputElement>) => void
}

const IdentityForm = memo(function IdentityForm({
  firstName,
  lastName,
  onSubmit,
  onFirstNameChange,
  onLastNameChange,
}: IdentityFormProps) {
  return (
    <>
      <div className="badge badge-green">Daily Check-In</div>
      <h1 className="step-title">Good Morning</h1>
      <p className="step-sub">Enter your name and take a quick selfie to confirm attendance.</p>
      <form onSubmit={onSubmit} style={{ width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>First Name</label>
            <input value={firstName} onChange={onFirstNameChange} required placeholder="John" />
          </div>
          <div className="field">
            <label>Last Name</label>
            <input value={lastName} onChange={onLastNameChange} required placeholder="Smith" />
          </div>
        </div>
        <button className="btn btn-success" type="submit">Continue →</button>
      </form>
    </>
  )
})

export function CheckIn() {
  const nav = useNavigate()
  const { worker } = useWorkGuardStore()
  const { isRecording, verifyVoice, countdownMs } = useVoiceBiometrics()
  const [step, setStep] = useState<Step>('identity')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [result, setResult] = useState<{ similarity: number; firstName: string } | null>(null)
  const [, setSelfieB64] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [voiceResult, setVoiceResult] = useState<{ matched: boolean; similarity: number } | null>(null)
  const checkedInAt = new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })

  const handleFirstNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFirstName(e.target.value)
  }, [])

  const handleLastNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setLastName(e.target.value)
  }, [])

  const handleIdentity = useCallback((e: FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName) return
    setStep('selfie')
  }, [firstName, lastName])

  async function handleSelfie(b64: string) {
    setSelfieB64(b64)
    setStep('verifying')
    try {
      const res = await verifyWorker({ selfie_b64: b64, first_name: firstName, last_name: lastName })
      if (res.verified) {
        setResult({ similarity: Math.round(res.similarity), firstName: res.first_name })
        // Optional voice check if we have an enrolled embedding
        const stored = worker?.cognitiveBaseline?.vocalEmbedding
        if (stored && stored.length > 0 && Math.round(res.similarity) >= 80) {
          setStep('voice')
        } else {
          setStep('success')
        }
      } else {
        setResult({ similarity: Math.round(res.similarity), firstName: firstName })
        setStep('failed')
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Verification failed')
      setStep('failed')
    }
  }

  async function handleVoiceCheck() {
    const stored = worker?.cognitiveBaseline?.vocalEmbedding
    if (!stored || stored.length === 0) {
      setStep('success')
      return
    }

    try {
      const res = await verifyVoice(stored)
      setVoiceResult(res)
      setStep('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Voice verification failed')
      setStep('failed')
    }
  }

  return (
    <div className="page">
      <div className="logo" style={{ cursor: 'pointer' }} onClick={() => nav('/')}>← WORKGUARD</div>

      {step === 'identity' && (
        <IdentityForm
          firstName={firstName}
          lastName={lastName}
          onSubmit={handleIdentity}
          onFirstNameChange={handleFirstNameChange}
          onLastNameChange={handleLastNameChange}
        />
      )}

      {step === 'selfie' && (
        <>
          <div className="badge badge-green">Identity Verification</div>
          <h1 className="step-title">Face Check</h1>
          <p className="step-sub">Look at the camera. This takes 2 seconds.</p>
          <SelfieCapture onCapture={handleSelfie} />
        </>
      )}

      {step === 'verifying' && (
        <>
          <h1 className="step-title">Verifying...</h1>
          <p className="step-sub">Matching your face against registered profile</p>
          <div style={{ marginTop: 40, color: 'var(--cyan)', fontSize: 48 }}>⬡</div>
        </>
      )}

      {step === 'voice' && (
        <>
          <div className="badge badge-amber">Optional Step — Voice Check</div>
          <h1 className="step-title">Voice Verification</h1>
          <p className="step-sub">Record 2 seconds to confirm identity.</p>
          <button
            className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleVoiceCheck}
            disabled={isRecording}
          >
            {isRecording ? `● Recording... ${Math.ceil(countdownMs / 1000)}s` : 'Record Voice (2s)'}
          </button>
          <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => setStep('success')}>
            Skip
          </button>
        </>
      )}

      {step === 'success' && (
        <>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <div className="badge badge-green" style={{ margin: '0 auto 16px' }}>✓ Present</div>
          <h1 className="step-title">{result?.firstName} — Confirmed</h1>
          <p className="step-sub">Attendance recorded at {checkedInAt}</p>
          <div className="card" style={{ width: '100%', marginTop: 16 }}>
            <div className="metric-row">
              <span className="metric-label">Worker</span>
              <span className="metric-value">{firstName} {lastName}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Time</span>
              <span className="metric-value">{checkedInAt}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Match score</span>
              <span className="metric-value" style={{ color: 'var(--green)' }}>{result?.similarity}%</span>
            </div>

            {voiceResult && (
              <div className="metric-row">
                <span className="metric-label">Voice similarity</span>
                <span className="metric-value" style={{ color: voiceResult.matched ? 'var(--green)' : 'var(--red)' }}>
                  {Math.round(voiceResult.similarity * 100)}% {voiceResult.matched ? '✓' : '✗'}
                </span>
              </div>
            )}

            {voiceResult && (
              <div className="metric-row">
                <span className="metric-label">Combined</span>
                <span className="metric-value">
                  {Math.round(((result?.similarity ?? 0) / 100 * 0.7 + voiceResult.similarity * 0.3) * 100)}%
                </span>
              </div>
            )}
            <div className="metric-row">
              <span className="metric-label">Status</span>
              <span className="metric-value" style={{ color: 'var(--green)' }}>PRESENT ✓</span>
            </div>
          </div>
          <button className="btn btn-outline" style={{ marginTop: 20 }} onClick={() => nav('/')}>
            Done
          </button>
        </>
      )}

      {step === 'failed' && (
        <>
          <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
          <div className="badge" style={{ background:'rgba(239,68,68,0.12)', color:'var(--red)', border:'1px solid rgba(239,68,68,0.25)', margin:'0 auto 16px' }}>
            Not Verified
          </div>
          <h1 className="step-title">Identity Mismatch</h1>
          <p className="step-sub">
            {errorMsg || `Face match score: ${result?.similarity}% — minimum required: 80%`}
          </p>
          <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 20 }}>
            <button className="btn btn-outline" onClick={() => setStep('selfie')}>Try Again</button>
            <button className="btn btn-outline" onClick={() => nav('/')}>Cancel</button>
          </div>
        </>
      )}
    </div>
  )
}
