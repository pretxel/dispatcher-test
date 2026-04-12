import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    // DIRECT_URL is required for `prisma migrate dev` (non-pooled connection).
    // Falls back to DATABASE_URL if only one connection string is configured.
    // When neither is set (e.g. CI running prisma generate) an empty string is
    // passed; migrate commands will fail with a clear "missing env var" error.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
})
