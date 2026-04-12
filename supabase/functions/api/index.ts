import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Constants ──────────────────────────────────────────────────────────────────

const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED']
const ALL_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

// ── Helpers ────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function err(status: number, message: string): Response {
  const titles: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    404: 'Not Found',
    422: 'Unprocessable Entity',
  }
  return json({ statusCode: status, error: titles[status] ?? 'Error', message }, status)
}

// ── Auth ───────────────────────────────────────────────────────────────────────

type AuthResult = { userId: string; db: SupabaseClient }

async function authenticate(req: Request): Promise<AuthResult | Response> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return err(401, 'Missing token')
  }
  const token = authHeader.slice(7)

  const supabaseUrl      = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey  = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const { data: { user }, error } =
    await createClient(supabaseUrl, supabaseAnonKey).auth.getUser(token)

  if (error || !user) return err(401, 'Invalid token')

  const db = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  return { userId: user.id, db }
}

// ── Route handlers ─────────────────────────────────────────────────────────────

async function getRelocations(db: SupabaseClient, userId: string): Promise<Response> {
  const { data, error } = await db
    .from('Relocation')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false })

  if (error) return json({ error: error.message }, 500)
  return json(data)
}

async function createRelocation(req: Request, db: SupabaseClient, userId: string): Promise<Response> {
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { origin, destination, date, notes } = body as {
    origin?: unknown; destination?: unknown; date?: unknown; notes?: unknown
  }

  if (!origin || typeof origin !== 'string')
    return err(400, 'origin is required')
  if (!destination || typeof destination !== 'string')
    return err(400, 'destination is required')
  if (!date || typeof date !== 'string')
    return err(400, 'date is required')

  const execDate = new Date(date)
  if (isNaN(execDate.getTime()))
    return err(400, 'Invalid date format')
  if (execDate <= new Date())
    return err(422, 'Execution date must be in the future')

  const { data: created, error } = await db
    .from('Relocation')
    .insert({
      id: crypto.randomUUID(),
      origin,
      destination,
      date: execDate.toISOString(),
      notes: typeof notes === 'string' ? notes : null,
      userId,
      status: 'PENDING',
      updatedAt: new Date().toISOString(),
      // createdAt omitted — Postgres DEFAULT CURRENT_TIMESTAMP handles it
    })
    .select()
    .single()

  if (error) return json({ error: error.message }, 500)
  return json(created, 201)
}

async function updateRelocation(
  req: Request,
  db: SupabaseClient,
  userId: string,
  id: string,
): Promise<Response> {
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { data: existing, error: fetchError } = await db
    .from('Relocation')
    .select('*')
    .eq('id', id)
    .eq('userId', userId)
    .single()

  if (fetchError || !existing)
    return err(404, 'Relocation not found')

  if (TERMINAL_STATUSES.includes(existing.status))
    return err(400, 'Cannot edit a completed or cancelled relocation')

  const { origin, destination, date, notes, status } = body as Record<string, string | undefined>
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }

  if (origin) updates.origin = origin
  if (destination) updates.destination = destination
  if (notes !== undefined) updates.notes = notes || null
  if (date) {
    const d = new Date(date)
    if (isNaN(d.getTime())) return err(400, 'Invalid date')
    updates.date = d.toISOString()
  }
  if (status) {
    if (!ALL_STATUSES.includes(status)) return err(400, 'Invalid status')
    updates.status = status
  }

  const { data: updated, error: updateError } = await db
    .from('Relocation')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) return json({ error: updateError.message }, 500)
  return json(updated)
}

// ── Router ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const { pathname } = new URL(req.url)

  if (req.method === 'GET' && pathname.endsWith('/health')) {
    return json({ status: 'ok' })
  }

  const auth = await authenticate(req)
  if (auth instanceof Response) return auth
  const { userId, db } = auth

  if (req.method === 'GET' && pathname.endsWith('/v1/relocations')) {
    return getRelocations(db, userId)
  }

  if (req.method === 'POST' && pathname.endsWith('/v1/relocations')) {
    return createRelocation(req, db, userId)
  }

  const putMatch = pathname.match(/\/v1\/relocations\/([^/]+)$/)
  if (req.method === 'PUT' && putMatch) {
    return updateRelocation(req, db, userId, decodeURIComponent(putMatch[1]))
  }

  return err(404, 'Route not found')
})
