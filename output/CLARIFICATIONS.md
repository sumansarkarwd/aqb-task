# Requirements clarifications — FinTrack Pro reconciliation

## 1. Numbered ambiguities (quote, assumption, rationale)

### 1. “Real-time” vs batch

- **Ambiguous quote(s):** “Accept a batch of bank records (uploaded as JSON, representing a CSV import)” (client brief, system requirement 1) and “The system should do reconciliation in real-time — we can't wait for a nightly job” (Slack).
- **Interpretation / assumed answer:** Finance uploads or submits a **batch** of bank rows; the product expectation is **low latency** (results soon after submit), not necessarily synchronous request/response or continuous streaming. “Real-time” is interpreted as “no reliance on a nightly batch as the only path,” not as “the HTTP request must block until reconciliation completes.”
- **Why this interpretation:** A nightly-only model is explicitly rejected in Slack, but the rest of the brief still describes discrete bank imports. Treating “real-time” as strict in-process synchronous reconciliation would conflict with batch JSON uploads and with typical reliability patterns (retries, idempotency). Until the client defines an SLA (e.g. seconds vs minutes), assuming **interactive submit + fast async completion** is the smallest assumption that satisfies both statements.

### 2. Period rules

- **Ambiguous quote:** “Match them against internal payment records for a given period” (client brief, system requirement 2).
- **Interpretation / assumed answer:** The “period” is a single **reporting window** `[periodStart, periodEnd)` applied consistently: bank rows are included when their **value date** falls in the window; internal rows are included when their **system timestamp** (e.g. `createdAt`) falls in the same window, unless the client specifies a different system field (e.g. settlement/cleared date). Boundaries are **half-open** unless the client insists on inclusive end dates.
- **Why this interpretation:** The brief does not say whether bank **value date** and internal **booking/creation** time are comparable or which system date is authoritative. Half-open ranges avoid double-counting at boundaries and match common reporting practice; without confirmation, aligning both sides to one window is clearer than mixing ad hoc rules.

### 3. Ties / duplicates

- **Ambiguous quote:** “Payments need to be properly matched against the bank records” (Slack).
- **Interpretation / assumed answer:** Matching is **one-to-one** where possible: each bank line matches at most one payment and each payment at most one bank line. When several candidates share the same match key (e.g. identical amount), use a **deterministic tie-break** (e.g. earliest eligible payment by `createdAt`, then by `id`) until the client provides a stronger business key (e.g. reference). Duplicate **bank** `transactionId`s in one import are treated as invalid or second occurrences unmatched until clarified.
- **Why this interpretation:** Without tie-breaking rules, “properly matched” is undefined and results become unstable across runs. Deterministic ordering preserves reproducibility for audits; asking for a canonical reference field would be ideal but cannot be assumed from the brief alone.

### 4. Which payments are in scope

- **Ambiguous quote:** “Match them against internal payment records for a given period” (client brief, system requirement 2).
- **Interpretation / assumed answer:** Only payments in statuses that represent **money movement the bank statement can reflect** are eligible (e.g. **cleared**), plus optionally **pending** if the bank file includes unsettled items. **Disputed** and already **reconciled** payments are excluded from automatic pairing unless the client wants re-runs to **re-open** prior matches.
- **Why this interpretation:** Matching pending or disputed items against cleared bank activity can create false positives or policy violations. Excluding reconciled avoids double-counting unless the product explicitly supports reversal workflows, which the brief does not describe.

### 5. USD

- **Ambiguous quote:** “We handle multiple currencies but for now just focus on USD” (Slack).
- **Interpretation / assumed answer:** For this phase, **only USD rows are reconciled**: bank records and internal payments with `currency !== "USD"` are **rejected** at validation time (or returned in a separate “out of scope” bucket), not silently converted or ignored without audit.
- **Why this interpretation:** “Focus on USD” does not say whether non-USD lines should fail closed, skip, or convert. Failing closed (or explicit out-of-scope reporting) avoids silent wrong matches and incorrect totals; conversion would require FX source and policy the brief does not provide.

### 6. Matching keys

- **Ambiguous quote:** “Payments need to be properly matched against the bank records” (Slack).
- **Interpretation / assumed answer:** The **primary** match is on a **stable business key** when present (e.g. bank `reference` ↔ system `externalRef`, normalized), with **amount** and **date proximity** as guardrails. If keys are missing or ambiguous, fall back to **amount + date window + deterministic tie-break** and surface low-confidence matches for review.
- **Why this interpretation:** Amount-only matching (as in the starter sketch) is known to collide; reference-like fields exist in the types but the brief never names them as authoritative. Stating a key-first strategy with conservative fallbacks balances automation with false-match risk until the client confirms the canonical identifier from the bank file.

### 7. Compliance (PCI DSS / SOC 2 context)

- **Ambiguous quote:** “Compliance is critical — we're PCI DSS Level 1 and SOC 2 certified” (Slack).
- **Question for the client:** For reconciliation imports and reports, **what data may appear in bank `description` / `reference` and in API logs** (e.g. full payloads vs redacted), **who may access** reconciliation results at rest, and **what retention and deletion policy** applies to uploaded bank JSON and stored run outputs (including failed runs)?
- **Interpretation / assumed answer until answered:** Treat bank payloads and reconciliation artifacts as **sensitive financial data**: minimize logging (no full PAN if ever present), restrict access by role, and retain only as long as finance/regulatory policy requires, with a default placeholder policy documented in the run record rather than logging raw bodies.
- **Why this matters:** PCI and SOC 2 impose expectations on access control, auditability, and data handling; the brief names compliance but not scope or retention for this specific flow, so engineering cannot safely guess legal/regulatory minima.

---

## 2. Question I would **not** ask the client

**Question I would not ask:** “Should reconciliation run synchronously inside the API request versus in a background worker with polling or push notification when the batch finishes?”

**Rationale:** This is primarily an **engineering** decision: the same user-facing outcome—“upload a batch, get a completed run and visibility in the dashboard”—can be met with a **queued job** that does not block the user from submitting further work, plus **notification** (in-app, email, or webhook) when processing completes. Trade-offs (throughput, timeouts, retries, idempotency, cost) are owned by the engineering team and can be aligned later to a **product SLA** (“results within N minutes”) without the client choosing worker frameworks or HTTP blocking semantics. The product question worth asking instead is **how quickly** results must be available under expected volumes, not **how** the server schedules work.
