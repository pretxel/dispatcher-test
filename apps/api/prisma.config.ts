import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'

export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  migrate: {
    adapter: () => {
      const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? ''
      return new PrismaPg({ connectionString })
    },
  },
})
