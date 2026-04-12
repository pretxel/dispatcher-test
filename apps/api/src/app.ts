import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import prismaPlugin from './plugins/prisma'
import authPlugin from './plugins/auth'
import { relocationRoutes } from './routes/relocations'

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })

  app.register(cors, {
    origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? undefined : '*'),
    methods: ['GET', 'POST', 'PUT'],
  })

  // /health must be registered before authPlugin so the global preHandler hook
  // added by fastify-plugin does not intercept it.
  app.get('/health', async () => ({ status: 'ok' }))

  app.register(prismaPlugin)
  app.register(authPlugin)
  app.register(relocationRoutes)

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500
    reply.code(statusCode).send({
      statusCode,
      error: error.name,
      message: error.message,
    })
  })

  return app
}
