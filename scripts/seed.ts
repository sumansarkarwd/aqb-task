import { randomUUID } from 'node:crypto'
import { db, sqlite } from '../src/lib/db'
import { payments, reconciliations, reconciliationRuns } from '../src/lib/db/schema'

async function seed() {
  sqlite.exec(`
    DELETE FROM payments;
    DELETE FROM reconciliations;
    DELETE FROM reconciliation_runs;
  `)

  const periodStart = new Date('2026-01-01T00:00:00.000Z')
  const periodEnd = new Date('2026-02-01T00:00:00.000Z')

  await db.insert(payments).values([
    {
      id: randomUUID(),
      externalRef: 'INV-1001',
      amount: 19.99,
      currency: 'USD',
      createdAt: new Date('2026-01-10T12:00:00.000Z'),
      status: 'cleared',
    },
    {
      id: randomUUID(),
      externalRef: 'INV-1002',
      amount: 250.0,
      currency: 'USD',
      createdAt: new Date('2026-01-15T09:30:00.000Z'),
      status: 'pending',
    },
    {
      id: randomUUID(),
      externalRef: 'INV-1003',
      amount: 99.5,
      currency: 'USD',
      createdAt: new Date('2026-01-20T16:45:00.000Z'),
      status: 'cleared',
    },
    {
      id: randomUUID(),
      externalRef: 'INV-1004',
      amount: 19.99,
      currency: 'USD',
      createdAt: new Date('2026-01-22T11:00:00.000Z'),
      status: 'cleared',
    },
  ])

  await db.insert(reconciliations).values({
    id: randomUUID(),
    periodStart,
    periodEnd,
    matchedCount: 2,
    unmatchedCount: 1,
    totalBankAmount: 369.49,
    totalSystemAmount: 389.48,
    difference: -19.99,
    status: 'complete',
  })

  await db.insert(reconciliationRuns).values({
    id: randomUUID(),
    notes: 'Seed run for local testing',
    createdAt: new Date(),
  })

  console.log('Database seeded successfully.')
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
