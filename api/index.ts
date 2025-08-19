import express from 'express'
import cors from 'cors'
import authRoutes from '../server/authRoutes'

const app = express()
app.use(cors({ origin: true, credentials: true }))
// Express 5 + path-to-regexp v6 does not support '*' string paths
// Use a RegExp to handle all OPTIONS preflight requests
app.options(/.*/, cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use('/api/auth', authRoutes)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV ?? 'development', time: Date.now() })
})

// Error handler to always return JSON
app.use((err: any, _req: any, res: any, _next: any) => {
  try { console.error(err) } catch {}
  if (!res.headersSent) res.status(500).json({ error: 'Server error' })
})

export default function handler(req: any, res: any) {
  return app(req, res)
}


