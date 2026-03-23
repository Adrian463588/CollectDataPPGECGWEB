# Experiment Controller Client (Frontend)

This is a [Next.js](https://nextjs.org) application bootstrapped with `create-next-app`, serving as the UI for the stress detection study.

## Setup & Architecture
The frontend uses:
- **Next.js 15 (App Router)**
- **Tailwind CSS**
- **Framer Motion** (for smooth UI transitions)
- **TypeScript**

To avoid CORS and LAN isolation issues, all backend requests go through an API proxy (`src/app/api-proxy/[...path]/route.ts`). This ensures the user's browser only talks to the Next.js server, which in turn seamlessly forwards the traffic to the Go backend.

## Quick Start (Local Setup)

The frontend is meant to be run directly on your host machine without Docker. Make sure you have Node.js installed (≥ 18).

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Ensure `.env.local` contains:
   ```env
   NEXT_PUBLIC_API_URL=/api-proxy
   BACKEND_URL=http://localhost:8081
   NEXT_PUBLIC_APP_NAME=Experiment Controller
   NEXT_PUBLIC_ENABLE_DEV_CONTROLS=true
   ```

3. **Run the Frontend**
   To run just the frontend development server (from the root directory):
   ```bash
   make dev-frontend
   ```
   Or, you can start both frontend and backend concurrently:
   ```bash
   make dev
   ```

Open [http://localhost:3000](http://localhost:3000) or [http://192.168.56.1:3000](http://192.168.56.1:3000) (if accessing via LAN) with your browser to see the result.

## Running Tests

Run all frontend Jest unit tests:
```bash
make test-frontend
```

## Build

To build the static application or production server:
```bash
make build-frontend
```
