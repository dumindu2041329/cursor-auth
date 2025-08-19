import type { VercelRequest, VercelResponse } from '@vercel/node'
import express from 'express'
import serverless from 'serverless-http'
import authRoutes from '../server/authRoutes'
import cors from 'cors'

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use('/api/auth', authRoutes)

const handler = serverless(app)

export default async function(req: VercelRequest, res: VercelResponse) {
  return handler(req as any, res as any)
}


