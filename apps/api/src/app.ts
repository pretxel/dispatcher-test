import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })

  app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT'],
  })

  // Health check
  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
