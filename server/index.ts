import express from 'express'
import type { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import authRoutes from './authRoutes'

import dotenv from 'dotenv'
dotenv.config()

const isProd = process.env.NODE_ENV === 'production'
const port = process.env.PORT ? Number(process.env.PORT) : 5173

async function createServer() {
  const app = express()

  app.use(express.json({ limit: '1mb' }))
  app.use('/api/auth', authRoutes)

  // Demo API route(s)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', env: process.env.NODE_ENV ?? 'development', time: Date.now() })
  })

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      root: process.cwd(),
      server: { middlewareMode: true },
      appType: 'custom',
    })
    app.use(vite.middlewares)

    // Fallback for all non-API GET requests
    app.use(async (req: Request, res: Response, next) => {
      try {
        if (req.method !== 'GET') return next()
        if (req.path.startsWith('/api')) return next()
        const url = req.originalUrl
        const indexPath = path.resolve(process.cwd(), 'index.html')
        let template = fs.readFileSync(indexPath, 'utf-8')
        template = await vite.transformIndexHtml(url, template)
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template)
      } catch (e) {
        // @ts-ignore - available on Vite dev server
        ;(vite as any).ssrFixStacktrace?.(e)
        next(e as any)
      }
    })
  } else {
    const distPath = path.resolve(process.cwd(), 'dist')
    const indexHtml = path.join(distPath, 'index.html')
    app.use(express.static(distPath))
    // Fallback for SPA routes in production
    app.use((req: Request, res: Response, next) => {
      if (req.method !== 'GET') return next()
      if (req.path.startsWith('/api')) return next()
      return res.sendFile(indexHtml)
    })
  }

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`)
  })
}

createServer()


