import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED']
const ALL_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const pathname = new URL(req.url).pathname

  // Health — no auth required
  if (req.method === 'GET' && pathname.endsWith('/health')) {
    return json({ status: 'ok' })
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ statusCode: 401, error: 'Unauthorized', message: 'Missing token' }, 401)
  }
  const token = authHeader.slice(7)

  const supabaseUrl       = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey   = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const { data: { user }, error: authError } =
    await createClient(supabaseUrl, supabaseAnonKey).auth.getUser(token)

  if (authError || !user) {
    return json({ statusCode: 401, error: 'Unauthorized', message: 'Invalid token' }, 401)
  }

  const userId = user.id
  // Service-role client — bypasses RLS, we filter by userId manually
  const db = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  // ── GET /api/v1/relocations ───────────────────────────────────────────────
  if (req.method === 'GET' && pathname.endsWith('/v1/relocations')) {
    const { data, error } = await db
      .from('Relocation')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false })

    if (error) return json({ error: error.message }, 500)
    return json(data)
  }

  // ── POST /api/v1/relocations ──────────────────────────────────────────────
  if (req.method === 'POST' && pathname.endsWith('/v1/relocations')) {
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

    const { origin, destination, date, notes } = body as {
      origin?: unknown; destination?: unknown; date?: unknown; notes?: unknown
    }

    if (!origin || typeof origin !== 'string')
      return json({ statusCode: 400, error: 'Bad Request', message: 'origin is required' }, 400)
    if (!destination || typeof destination !== 'string')
      return json({ statusCode: 400, error: 'Bad Request', message: 'destination is required' }, 400)
    if (!date || typeof date !== 'string')
      return json({ statusCode: 400, error: 'Bad Request', message: 'date is required' }, 400)

    const execDate = new Date(date)
    if (isNaN(execDate.getTime()))
      return json({ statusCode: 400, error: 'Bad Request', message: 'Invalid date format' }, 400)
    if (execDate <= new Date())
      return json({ statusCode: 422, error: 'Unprocessable Entity', message: 'Execution date must be in the future' }, 422)

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

  // ── PUT /api/v1/relocations/:id ───────────────────────────────────────────
  const putMatch = pathname.match(/\/v1\/relocations\/([^/]+)$/)
  if (req.method === 'PUT' && putMatch) {
    const id = decodeURIComponent(putMatch[1])

    let body: Record<string, unknown>
    try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

    const { data: existing, error: fetchError } = await db
      .from('Relocation')
      .select('*')
      .eq('id', id)
      .eq('userId', userId)
      .single()

    if (fetchError || !existing)
      return json({ statusCode: 404, error: 'Not Found', message: 'Relocation not found' }, 404)

    if (TERMINAL_STATUSES.includes(existing.status))
      return json({ statusCode: 400, error: 'Bad Request', message: 'Cannot edit a completed or cancelled relocation' }, 400)

    const { origin, destination, date, notes, status } = body as Record<string, string | undefined>
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }

    if (origin) updates.origin = origin
    if (destination) updates.destination = destination
    if (notes !== undefined) updates.notes = notes || null
    if (date) {
      const d = new Date(date)
      if (isNaN(d.getTime()))
        return json({ statusCode: 400, error: 'Bad Request', message: 'Invalid date' }, 400)
      updates.date = d.toISOString()
    }
    if (status) {
      if (!ALL_STATUSES.includes(status))
        return json({ statusCode: 400, error: 'Bad Request', message: 'Invalid status' }, 400)
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

  return json({ statusCode: 404, error: 'Not Found', message: 'Route not found' }, 404)
})
