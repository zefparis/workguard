# WorkGuard — Worker Identity Verification

Biometric attendance verification system for industrial sites in South Africa. Powered by AWS Rekognition and Hybrid Vector technology (3 French patents).

## Features

- **Worker Enrollment**: 6-step biometric registration process
  - Identity information capture
  - Facial recognition via selfie
  - Cognitive baseline tests (Stroop, Neural Reflex, Vocal Imprint, Reaction Time)
  
- **Daily Check-In**: Quick verification flow
  - Name entry
  - Selfie capture
  - Instant facial match verification

- **Security**: AWS Rekognition facial matching with ML-KEM FIPS 203 encryption

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Zustand
- **Routing**: React Router v6
- **Styling**: Custom CSS with dark theme
- **API**: Hybrid Vector API (https://hybrid-vector-api.onrender.com)

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
VITE_API_URL=https://hybrid-vector-api.onrender.com
VITE_TENANT_ID=demo-tenant
VITE_API_KEY=
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3001`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
workguard/
├── src/
│   ├── components/       # React components
│   │   ├── SelfieCapture.tsx
│   │   ├── StroopTest.tsx
│   │   ├── NeuralReflex.tsx
│   │   ├── VocalImprint.tsx
│   │   └── ReactionTime.tsx
│   ├── pages/           # Page components
│   │   ├── Home.tsx
│   │   ├── Enroll.tsx
│   │   └── CheckIn.tsx
│   ├── hooks/           # Custom React hooks
│   │   └── useCamera.ts
│   ├── services/        # API services
│   │   └── api.ts
│   ├── store/           # Zustand store
│   │   └── workguardStore.ts
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Routes

- `/` - Home page with Register and Check In options
- `/enroll` - Worker enrollment flow (6 steps)
- `/checkin` - Daily check-in verification

## Design

- **Theme**: Dark mode (#0a0f1e background)
- **Accent**: Cyan (#00C2FF)
- **Layout**: Mobile-first, centered (max-width 480px)
- **Typography**: Inter font family

## API Integration

The app integrates with the Hybrid Vector API for:
- Worker enrollment (`POST /edguard/enroll`)
- Identity verification (`POST /edguard/verify`)

## License

MIT

## Author

Hybrid Vector / CoreHuman
