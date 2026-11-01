# RemoteCam

> A consent-based, privacy-first remote camera monitoring and local recording SaaS platform.

Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Soft Neumorphism (3D UI)**, **NeonDB Serverless PostgreSQL**, **Prisma ORM**, **Better Auth**, and **WebRTC**.

---

## 🌟 Key Features

- **WebRTC Peer-to-Peer Live Video & Audio**: Real-time camera & microphone feed with sub-second latency directly between devices.
- **Double Consent Security Gate**: Clear attribution of session owner, mandatory target camera permission, and explicit local recording consent.
- **Stealth Black Screen Mode**: Allows target device to turn display completely pitch black while maintaining camera and audio recording.
- **Local Device Storage**: Video recordings are captured via `MediaRecorder` API and written directly to local physical disk via File System Access API / Blob download.
- **Cryptographic Expiring Join Links**: SHA-256 hashed join tokens with customizable expiration (15m, 1h, 24h) and instant revocation.
- **Soft Neumorphic 3D Aesthetics**: Beautiful tactile light surfaces, raised cards, recessed inputs, and orange interactive highlights.
- **Bilingual Documentation**: Built-in step-by-step guides in both Bengali (বাংলা) and English.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Sonner |
| **Backend** | Next.js Route Handlers, Better Auth, Zod Validation |
| **Database** | PostgreSQL on NeonDB, Prisma 6 ORM |
| **Real-Time** | WebRTC, WebSocket Signaling Server (`ws`), MediaRecorder API |

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/AsmualDev/RemoteCam.git
cd RemoteCam
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

### 4. Push database schema to NeonDB
```bash
npx prisma db push
```

### 5. Run the development server
```bash
npm run dev
```

In a separate terminal, launch the WebRTC signaling server:
```bash
npm run signaling
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📜 License
MIT License. © 2026 RemoteCam.
