import express from 'express'
import cors from 'cors'
import serverless from 'serverless-http'
import authRoutes from '../server/authRoutes'

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use('/api/auth', authRoutes)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV ?? 'development', time: Date.now() })
})

const handler = serverless(app)

export default async function(req: any, res: any) {
  return handler(req, res)
}


