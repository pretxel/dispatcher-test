import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { TERMINAL_STATUSES, ALL_STATUSES } from '@flovi/types'

const createSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  date: z.string().datetime(),
  notes: z.string().max(500).optional(),
})

const updateSchema = z.object({
  origin: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(ALL_STATUSES as [string, ...string[]]).optional(),
})

export async function relocationRoutes(app: FastifyInstance) {
  // POST /api/v1/relocations
  app.post('/api/v1/relocations', async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues[0].message,
      })
    }

    const { origin, destination, date, notes } = parsed.data
    if (new Date(date) <= new Date()) {
      return reply.code(422).send({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'Execution date must be in the future',
      })
    }

    const relocation = await app.prisma.relocation.create({
      data: {
        origin,
        destination,
        date: new Date(date),
        notes,
        userId: request.userId,
      },
    })

    return reply.code(201).send(relocation)
  })

  // GET /api/v1/relocations
  app.get('/api/v1/relocations', async (request, reply) => {
    const relocations = await app.prisma.relocation.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(relocations)
  })

  // PUT /api/v1/relocations/:id
  app.put('/api/v1/relocations/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues[0].message,
      })
    }

    const existing = await app.prisma.relocation.findUnique({ where: { id, userId: request.userId } })
    if (!existing) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Relocation not found',
      })
    }

    if (TERMINAL_STATUSES.includes(existing.status as any)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Cannot edit a completed or cancelled relocation',
      })
    }

    const { date, ...rest } = parsed.data
    const updated = await app.prisma.relocation.update({
      where: { id },
      data: {
        ...rest,
        ...(date ? { date: new Date(date) } : {}),
      },
    })

    return reply.send(updated)
  })
}
