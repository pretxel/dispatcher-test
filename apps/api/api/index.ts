import { buildApp } from '../src/app.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const app = buildApp()
const ready = app.ready()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ready
  app.server.emit('request', req, res)
}
