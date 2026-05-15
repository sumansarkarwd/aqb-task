# FinTrack Pro — Code Audit (Task 2)

**Audited:** 2026-05-15  
**Scope:** `src/lib/services/reconciliation/reconciler.ts`, `src/app/api/v1/reconcile/route.ts`, `src/components/reconciliation/ReconciliationDashboard.tsx`  
**Reference:** `docs/task.md` requirements and severity/category definitions  

**Summary:** 24 genuine issues (3 Critical, 12 High, 9 Medium). Several starter bugs in the dashboard and `GET` list path are **fixed** in the current repo (noted below).

---

## Findings table

| # | File | Location | Severity | Category | Description | Correct Fix |
|---|------|----------|----------|----------|-------------|-------------|
| 1 | `src/app/api/v1/reconcile/route.ts` | lines 41–43 | Critical | Security | `POST` interpolates `runId` and `notes` into raw SQL via `sqlite.exec`, enabling SQL injection. | Insert via Drizzle `reconciliationRuns` (or parameterized `sqlite.prepare`) with bound values. |
| 2 | `src/app/api/v1/reconcile/route.ts` | lines 61–63 | Critical | Security | `GET ?id=` interpolates `id` into SQL in `.prepare(\`…'${id}'\`)`, enabling SQL injection. | Validate `id` as UUID and query with a bound parameter or Drizzle `eq()`. |
| 3 | `src/app/api/v1/reconcile/route.ts` | lines 36–73 | Critical | Compliance | Neither `POST` nor `GET` calls `getSession()`; financial reconciliation is unauthenticated. | Require `getSession()`, return `401` when absent, enforce role (e.g. `finance`/`admin`) before DB access. |
| 4 | `src/app/api/v1/reconcile/route.ts` | lines 50–52 | High | Security | Error handler returns `error.stack` (or stringified error) to clients. | Log server-side; return generic `{ error: "Internal server error" }` for unexpected failures. |
| 5 | `src/app/api/v1/reconcile/route.ts` | lines 50–52 | High | Compliance | Stack traces and internal error text in API responses violate least-privilege / SOC 2-style production handling. | Same as #4; never return stack traces or raw DB errors to callers. |
| 6 | `src/app/api/v1/reconcile/route.ts` | lines 40–49 | High | API | Response exposes two IDs: `runId` (`reconciliation_runs`) and `result.id` (`reconciliations`) with no FK link. | One canonical run ID: either drop `reconciliation_runs` or link it to `reconciliations.id` and return a single `id`. |
| 7 | `src/app/api/v1/reconcile/route.ts` | lines 60–64 | High | API | `GET ?id=` reads `reconciliation_runs` and returns a raw array, not `{ runs: [...] }` and not reconciliation summary fields. | Detail endpoint should load from `reconciliations` (or join) and return the same DTO shape as the list handler. |
| 8 | `src/app/api/v1/reconcile/route.ts` | lines 50–52 | Medium | API | Zod validation failures and other client errors return `500` with stack traces instead of `400`/`422`. | Catch `ZodError` and return `400`/`422` with safe field errors; reserve `500` for unexpected errors. |
| 9 | `src/lib/services/reconciliation/reconciler.ts` | lines 54–56, 111 | High | Logic | Matching uses amount equality only; unrelated payments with the same amount are paired. | Match on normalized `reference` ↔ `externalRef` first, then amount/date guards and deterministic tie-breaks. |
| 10 | `src/lib/services/reconciliation/reconciler.ts` | line 55 | High | Logic | `p.amount === bankRecord.amount` compares floats with `===`, causing missed/false matches. | Compare integer minor units (cents) or fixed-scale decimals, never raw floats. |
| 11 | `src/lib/services/reconciliation/reconciler.ts` | lines 75–76, 120–122 | High | Logic | Totals and `calculateDelta` use floating-point `+` / `-`, accumulating rounding error. | Sum and diff in minor units (or decimal library); format only at the UI/API boundary. |
| 12 | `src/lib/services/reconciliation/reconciler.ts` | lines 102, 146 | High | Logic | `discrepancies` is never populated; amount/key conflicts are not surfaced for review. | Push pairs with same business key but differing amounts into `discrepancies` with `amountDelta`. |
| 13 | `src/lib/services/reconciliation/reconciler.ts` | lines 106–117, 127–140 | High | Logic | No transaction, locking, or idempotency; concurrent runs can match/update the same payment. | Wrap match + `markReconciled` + insert in a transaction with row locks or a period-level advisory lock. |
| 14 | `src/lib/services/reconciliation/reconciler.ts` | line 120 | High | Logic | `totalBankAmount` sums all `bankData`, including rows skipped as out-of-period in the loop. | Sum only in-period bank rows (same filter as matching). |
| 15 | `src/lib/services/reconciliation/reconciler.ts` | lines 61–62, 99 | Medium | Logic | Bank dates use half-open `[start, end)`; system payments use inclusive `between(createdAt, …)`. | Use one consistent boundary rule on both sides. |
| 16 | `src/lib/services/reconciliation/reconciler.ts` | lines 68–69, 107–108 | High | Logic | `new Date(isoString)` is timezone-ambiguous for bank timestamps without `Z`. | Parse in a defined timezone (e.g. UTC) with explicit offset handling. |
| 17 | `src/lib/services/reconciliation/reconciler.ts` | lines 96–99 | High | Logic | All payment statuses in the period are eligible, including `disputed` and already `reconciled`. | Filter to eligible statuses only (e.g. `cleared`, optionally `pending`). |
| 18 | `src/lib/services/reconciliation/reconciler.ts` | lines 84–86 | Medium | Logic | `markReconciled` only updates `pending` payments; matched `cleared` rows stay `cleared`. | Transition all successfully matched eligible payments to `reconciled`. |
| 19 | `src/lib/services/reconciliation/reconciler.ts` | line 124 | Medium | Logic | `bankOnly` includes out-of-period bank rows skipped via `continue`. | Exclude out-of-period rows from `bankOnly` or bucket them separately. |
| 20 | `src/lib/services/reconciliation/reconciler.ts` | lines 54–56 | Medium | Logic | `Array.find` picks the first same-amount payment with no deterministic ordering. | Sort candidates by `createdAt`/`id` (and prefer reference match) for reproducible runs. |
| 21 | `src/lib/services/reconciliation/reconciler.ts` | lines 96–99 | Medium | Logic | No `currency === 'USD'` filter despite client “focus on USD” note. | Reject or segregate non-USD rows at validation/reconcile time. |
| 22 | `src/lib/services/reconciliation/reconciler.ts` | line 110 | Medium | Performance | Each bank row re-filters all `systemPayments` (`O(n×m)`). | Pre-index candidates by match key and/or amount bucket once per run. |
| 23 | `src/lib/services/reconciliation/reconciler.ts` | lines 106–117 | Medium | Logic | Duplicate `transactionId` values in one batch are not detected. | Reject duplicates or flag subsequent occurrences as invalid/unmatched. |
| 24 | `src/components/reconciliation/ReconciliationDashboard.tsx` | lines 31–36 | Medium | API | Failed fetches are swallowed; non-OK responses still call `res.json()` without checking `res.ok`. | Check `res.ok`, surface error/empty states, and avoid treating error payloads as runs. |

---

## Resolved since starter (not listed as open bugs)

| Area | Change in repo |
|------|----------------|
| `GET` list | Without `?id=`, returns `{ runs: rows.map(mapRun) }` from `reconciliations` (lines 67–72). |
| Dashboard polling | Initial `loadRuns()` on mount + `clearInterval` cleanup (lines 39–44). |
| Dashboard ↔ list API | Default fetch matches list contract (`data.runs`). |

---

## Detailed findings (with code)

### 1 — SQL injection on `POST` (Critical · Security)

```41:43:src/app/api/v1/reconcile/route.ts
    sqlite.exec(
      `INSERT INTO reconciliation_runs (id, notes, created_at) VALUES ('${runId}', '${parsed.notes ?? ''}', datetime('now'))`,
    )
```

**Correct fix:** Use Drizzle `db.insert(reconciliationRuns).values({ … })` or `sqlite.prepare('INSERT … VALUES (?, ?, …)').run(runId, notes, …)`.

---

### 2 — SQL injection on `GET ?id=` (Critical · Security)

```60:64:src/app/api/v1/reconcile/route.ts
  if (id) {
    const runs = sqlite
      .prepare(`SELECT * FROM reconciliation_runs WHERE id = '${id}'`)
      .all()
    return NextResponse.json(runs)
```

**Correct fix:** Bind `id` as a parameter; validate UUID format before query.

---

### 3 — No authentication (Critical · Compliance)

`getSession()` exists at `src/lib/auth/session.ts` but is never imported in the route.

```36:49:src/app/api/v1/reconcile/route.ts
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
```

**Correct fix:** `const session = await getSession(); if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`.

---

### 4 & 5 — Error disclosure to clients (High · Security / Compliance)

```50:52:src/app/api/v1/reconcile/route.ts
  } catch (error: unknown) {
    const message = error instanceof Error ? error.stack : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
```

**Correct fix:** `console.error(error)` server-side; return `{ error: 'Internal server error' }` with status `500` (or `400`/`422` for Zod — see #8).

---

### 6 — Split run identifiers (High · API)

```40:49:src/app/api/v1/reconcile/route.ts
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
```

`reconcilePayments` persists a separate `reconciliations.id`:

```127:143:src/lib/services/reconciliation/reconciler.ts
  const [saved] = await db
    .insert(reconciliations)
    .values({
      id: crypto.randomUUID(),
      periodStart,
      periodEnd,
      matchedCount: matched.length,
      unmatchedCount: bankOnly.length + systemOnly.length,
      totalBankAmount,
      totalSystemAmount,
      difference,
      status: 'complete',
    })
    .returning()

  return {
    id: saved.id,
```

**Correct fix:** Use one ID for both persistence and API response; link `notes` on the same row or via FK.

---

### 7 — `GET ?id=` wrong table and response shape (High · API)

List path is correct; detail path still queries `reconciliation_runs` and returns a bare array (see snippet in #2).

**Correct fix:** `db.select().from(reconciliations).where(eq(reconciliations.id, id))` and return `{ run: mapRun(row) }` or consistent list DTO.

---

### 8 — Validation errors return 500 (Medium · API)

Same catch block as #4 — `ReconcileRequestSchema.parse` failures surface as `500` + stack.

**Correct fix:** `if (error instanceof z.ZodError) return NextResponse.json({ error: error.flatten() }, { status: 422 })`.

---

### 9 — Amount-only matching (High · Logic)

```50:56:src/lib/services/reconciliation/reconciler.ts
/**
 * Finds the best matching internal payment for a given bank record.
 * Matching strategy: find by amount.
 */
function findMatch(bankRecord: BankRecord, candidates: Payment[]): Payment | undefined {
  return candidates.find(p => p.amount === bankRecord.amount)
}
```

Used in the main loop:

```110:117:src/lib/services/reconciliation/reconciler.ts
    const remaining = systemPayments.filter(p => !matchedPaymentIds.has(p.id))
    const match = findMatch(bankRecord, remaining)
    if (match) {
      matched.push({ bankRecord, payment: match })
      matchedPaymentIds.add(match.id)
      matchedBankIds.add(bankRecord.transactionId)
      await markReconciled(match.id)
    }
```

**Correct fix:** Primary match on normalized `bankRecord.reference` / `payment.externalRef`; amount as guardrail only.

---

### 10 — Float equality for money (High · Logic)

```55:55:src/lib/services/reconciliation/reconciler.ts
  return candidates.find(p => p.amount === bankRecord.amount)
```

**Correct fix:** `toMinorUnits(p.amount) === toMinorUnits(bankRecord.amount)` (or compare decimal strings).

---

### 11 — Floating-point aggregates (High · Logic)

```75:77:src/lib/services/reconciliation/reconciler.ts
function calculateDelta(bankAmount: number, systemAmount: number): number {
  return bankAmount - systemAmount
}
```

```120:122:src/lib/services/reconciliation/reconciler.ts
  const totalBankAmount = bankData.reduce((sum, r) => sum + r.amount, 0)
  const totalSystemAmount = systemPayments.reduce((sum, p) => sum + p.amount, 0)
  const difference = calculateDelta(totalBankAmount, totalSystemAmount)
```

Schema also stores amounts as `real` (float):

```6:7:src/lib/db/schema.ts
  amount: real('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
```

**Correct fix:** Integer minor units end-to-end (DB + reconcile + API).

---

### 12 — `discrepancies` always empty (High · Logic)

```101:102:src/lib/services/reconciliation/reconciler.ts
  const matched: MatchedPair[] = []
  const discrepancies: Discrepancy[] = []
```

```142:147:src/lib/services/reconciliation/reconciler.ts
  return {
    id: saved.id,
    matched,
    unmatched: { bankOnly, systemOnly },
    discrepancies,
    summary: { totalBankAmount, totalSystemAmount, difference },
```

Nothing ever pushes to `discrepancies`.

**Correct fix:** When reference matches but amounts differ, `discrepancies.push({ bankRecord, payment, amountDelta })`.

---

### 13 — No concurrency safety (High · Logic)

`markReconciled` runs per match outside a transaction; insert happens after the loop with no lock:

```116:116:src/lib/services/reconciliation/reconciler.ts
      await markReconciled(match.id)
```

**Correct fix:** Single `db.transaction()` with `SELECT … FOR UPDATE` on candidate payments or a period-scoped lock.

---

### 14 — Bank total includes out-of-period rows (High · Logic)

```106:108:src/lib/services/reconciliation/reconciler.ts
  for (const bankRecord of bankData) {
    const bankDate = parseBankDate(bankRecord.valueDate)
    if (!isInPeriod(bankDate, periodStart, periodEnd)) continue
```

```120:120:src/lib/services/reconciliation/reconciler.ts
  const totalBankAmount = bankData.reduce((sum, r) => sum + r.amount, 0)
```

**Correct fix:** Reduce only rows that pass `isInPeriod`.

---

### 15 — Inconsistent period boundaries (Medium · Logic)

```61:62:src/lib/services/reconciliation/reconciler.ts
function isInPeriod(date: Date, periodStart: Date, periodEnd: Date): boolean {
  return date >= periodStart && date < periodEnd
}
```

```96:99:src/lib/services/reconciliation/reconciler.ts
  const systemPayments = await db
    .select()
    .from(payments)
    .where(between(payments.createdAt, periodStart, periodEnd))
```

**Correct fix:** Align both to half-open `[start, end)` or both inclusive — not mixed.

---

### 16 — Timezone-naive bank dates (High · Logic)

```68:69:src/lib/services/reconciliation/reconciler.ts
function parseBankDate(isoString: string): Date {
  return new Date(isoString)
}
```

**Correct fix:** Parse with explicit UTC (or bank TZ) via `Temporal` / `date-fns-tz` / append `Z` after contract validation.

---

### 17 — No payment status filter (High · Logic)

```96:99:src/lib/services/reconciliation/reconciler.ts
  const systemPayments = await db
    .select()
    .from(payments)
    .where(between(payments.createdAt, periodStart, periodEnd))
```

**Correct fix:** Add `and(eq(payments.status, 'cleared'), …)` (and exclude `reconciled` unless re-run is intended).

---

### 18 — `markReconciled` skips non-pending (Medium · Logic)

```82:86:src/lib/services/reconciliation/reconciler.ts
async function markReconciled(paymentId: string): Promise<void> {
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId))
  if (payment && payment.status === 'pending') {
    await db.update(payments).set({ status: 'reconciled' }).where(eq(payments.id, paymentId))
  }
}
```

**Correct fix:** Update `cleared` (and other eligible statuses) to `reconciled` after a successful match.

---

### 19 — Out-of-period rows in `bankOnly` (Medium · Logic)

```124:124:src/lib/services/reconciliation/reconciler.ts
  const bankOnly = bankData.filter(r => !matchedBankIds.has(r.transactionId))
```

Skipped in-loop rows never enter `matchedBankIds`, so they appear as unmatched.

**Correct fix:** Filter `bankOnly` with the same `isInPeriod(parseBankDate(r.valueDate), …)` check.

---

### 20 — Non-deterministic tie-breaking (Medium · Logic)

See `findMatch` in #9 — `Array.find` order depends on DB result order.

**Correct fix:** Sort `remaining` by `createdAt`, then `id`, before matching.

---

### 21 — No USD enforcement (Medium · Logic)

Zod accepts any `currency` string; reconciler never filters:

```12:13:src/lib/services/reconciliation/reconciler.ts
  currency: string
  valueDate: string // ISO date string from bank, e.g. "2026-01-15T14:30:00"
```

**Correct fix:** `z.literal('USD')` in schema (or filter/reject non-USD in reconciler with explicit reporting).

---

### 22 — Quadratic candidate filtering (Medium · Performance)

```110:110:src/lib/services/reconciliation/reconciler.ts
    const remaining = systemPayments.filter(p => !matchedPaymentIds.has(p.id))
```

**Correct fix:** Maintain a `Map` of unmatched candidates keyed by match key / amount bucket.

---

### 23 — Duplicate bank `transactionId` (Medium · Logic)

`matchedBankIds` is a `Set`, but two rows with the same `transactionId` can still match two payments if amounts align.

**Correct fix:** Validate unique `transactionId` in the request batch before matching.

---

### 24 — Dashboard hides failures (Medium · API)

```29:36:src/components/reconciliation/ReconciliationDashboard.tsx
    async function loadRuns() {
      try {
        const res = await fetch('/api/v1/reconcile')
        const data = await res.json()
        setRuns(data.runs ?? [])
      } catch {
        // silent
      }
    }
```

**Correct fix:** `if (!res.ok) throw …`; set error state; show empty vs error vs data distinctly.

---

## Severity totals

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 12 |
| Medium | 9 |

| Category | Count |
|----------|-------|
| Security | 3 |
| Compliance | 2 |
| Logic | 13 |
| API | 5 |
| Performance | 1 |
