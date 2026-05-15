import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { desc } from 'drizzle-orm'
import { db, sqlite } from '@/lib/db'
import { reconciliations } from '@/lib/db/schema'
import { reconcilePayments, BankRecord } from '@/lib/services/reconciliation/reconciler'

const ReconcileRequestSchema = z.object({
  bankData: z.array(
    z.object({
      transactionId: z.string(),
      amount: z.number(),
      currency: z.string(),
      valueDate: z.string(),
      description: z.string(),
      reference: z.string(),
    }),
  ),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  notes: z.string().optional(),
})

function mapRun(row: typeof reconciliations.$inferSelect) {
  return {
    id: row.id,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    matchedCount: row.matchedCount,
    unmatchedCount: row.unmatchedCount,
    difference: row.difference,
    status: row.status,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ReconcileRequestSchema.parse(body)
    const runId = crypto.randomUUID()
    sqlite.exec(
      `INSERT INTO reconciliation_runs (id, notes, created_at) VALUES ('${runId}', '${parsed.notes ?? ''}', datetime('now'))`,
    )
    const result = await reconcilePayments(
      parsed.bankData as BankRecord[],
      new Date(parsed.periodStart),
      new Date(parsed.periodEnd),
    )
    return NextResponse.json({ runId, ...result }, { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.stack : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (id) {
    const runs = sqlite
      .prepare(`SELECT * FROM reconciliation_runs WHERE id = '${id}'`)
      .all()
    return NextResponse.json(runs)
  }

  const rows = await db
    .select()
    .from(reconciliations)
    .orderBy(desc(reconciliations.periodStart))

  return NextResponse.json({ runs: rows.map(mapRun) })
}
