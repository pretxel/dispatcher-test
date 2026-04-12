import fp from 'fastify-plugin'
import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { FastifyPluginAsync } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (app) => {
  const connectionString = process.env.DATABASE_URL ?? ''
  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })
  await prisma.$connect()

  app.decorate('prisma', prisma)

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})

export default prismaPlugin
