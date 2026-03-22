import { useNavigate } from 'react-router-dom'

export function Home() {
  const nav = useNavigate()
  return (
    <div className="page">
      <div className="logo">⬡ WORKGUARD</div>
      <h1 className="step-title" style={{ fontSize: 30, marginBottom: 8 }}>Worker Identity</h1>
      <p className="step-sub">
        Biometric attendance verification for industrial sites.<br />
        Powered by Hybrid Vector — 3 French patents.
      </p>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => nav('/enroll')}>
          <div className="badge badge-cyan">New worker</div>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Register</h2>
          <p style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
            First-time enrollment — takes 3 minutes.<br />
            Identity + biometric profile + cognitive baseline.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 20 }}>
            Start Enrollment →
          </button>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => nav('/checkin')}>
          <div className="badge badge-green">Daily</div>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Check In</h2>
          <p style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6 }}>
            Already enrolled? Name + selfie → confirmed present.<br />
            Takes under 30 seconds.
          </p>
          <button className="btn btn-success" style={{ marginTop: 20 }}>
            Check In →
          </button>
        </div>
      </div>

      <div style={{ marginTop: 40, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['AWS Rekognition', 'ML-KEM FIPS 203', 'Air-gap ready'].map(t => (
          <span key={t} className="badge badge-cyan">{t}</span>
        ))}
      </div>
    </div>
  )
}
