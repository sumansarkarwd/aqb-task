import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  externalRef: text('external_ref').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  status: text('status', {
    enum: ['pending', 'cleared', 'reconciled', 'disputed'],
  }).notNull(),
})

export const reconciliations = sqliteTable('reconciliations', {
  id: text('id').primaryKey(),
  periodStart: integer('period_start', { mode: 'timestamp' }).notNull(),
  periodEnd: integer('period_end', { mode: 'timestamp' }).notNull(),
  matchedCount: integer('matched_count').notNull(),
  unmatchedCount: integer('unmatched_count').notNull(),
  totalBankAmount: real('total_bank_amount').notNull(),
  totalSystemAmount: real('total_system_amount').notNull(),
  difference: real('difference').notNull(),
  status: text('status', {
    enum: ['pending', 'running', 'complete', 'failed'],
  }).notNull(),
})

export const reconciliationRuns = sqliteTable('reconciliation_runs', {
  id: text('id').primaryKey(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
