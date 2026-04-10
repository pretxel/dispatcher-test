import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import prismaPlugin from './plugins/prisma'
import authPlugin from './plugins/auth'

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })

  app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT'],
  })

  app.register(prismaPlugin)
  app.register(authPlugin)

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500
    reply.code(statusCode).send({
      statusCode,
      error: error.name,
      message: error.message,
    })
  })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
