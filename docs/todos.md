# FinTrack Pro assessment — flat todo list

## Task 1 — Requirements clarification

1. Re-read the client brief and Slack notes end-to-end.
2. List every ambiguous or unanswered point (quote + your assumption + why you chose it).
3. Add at least one question that explicitly touches PCI / SOC 2 / compliance.
4. Add one question you would **not** ask the client, with a short “engineering vs product” rationale.
5. Create `CLARIFICATIONS.md` at the repo root with the numbered list above.
6. Proofread `CLARIFICATIONS.md` for clarity and completeness.

## Task 2 — Code audit

7. Read `lib/services/reconciliation/reconciler.ts` line by line.
8. Read `app/api/v1/reconcile/route.ts` line by line.
9. Read `components/reconciliation/ReconciliationDashboard.tsx` line by line.
10. Note every genuine bug (security, logic, API, performance, compliance) with file and location.
11. Assign severity (Critical / High / Medium / Low) and category per the brief’s definitions.
12. For each bug, write a one-line “correct fix” (no implementation yet).
13. Create `AUDIT.md` with the required markdown table and all rows filled.
14. Remove any non-bug “style only” rows so the audit stays high signal.

## Task 3 — Implementation

15. Fix `reconciler.ts`: define and document a clear matching strategy in a comment.
16. Fix `reconciler.ts`: handle money without floating-point accumulation errors.
17. Fix `reconciler.ts`: parse bank dates in a timezone-aware way.
18. Fix `reconciler.ts`: make concurrent reconciliations safe for the same period (e.g. locking / transactions / idempotency as appropriate).
19. Fix `reconciler.ts`: populate `discrepancies` when bank and system rows relate but amounts differ (or per your stated rules).
20. Fix `reconciler.ts`: ensure TypeScript types stay correct.
21. Fix `app/api/v1/reconcile/route.ts`: authenticate with `getSession()` and reject unauthenticated calls appropriately.
22. Fix `app/api/v1/reconcile/route.ts`: remove SQL injection risk (parameterized queries / Drizzle, not string-built SQL).
23. Fix `app/api/v1/reconcile/route.ts`: return generic errors to clients; log details server-side only.
24. Fix `app/api/v1/reconcile/route.ts`: use correct HTTP status codes and semantics for success and failure paths.
25. Fix `app/api/v1/reconcile/route.ts`: align `GET` behavior with a real listing/detail contract if the dashboard needs it.
26. Fix `ReconciliationDashboard.tsx`: correct the fetch URL, method, or response handling so it matches the API you ship.
27. Fix `ReconciliationDashboard.tsx`: stop silent failures where you need user-visible or logged errors (per your judgment).
28. Extend `ReconciliationDashboard.tsx`: add summary card — total runs this calendar month.
29. Extend `ReconciliationDashboard.tsx`: add summary card — sum of all `difference` values from runs shown.
30. Extend `ReconciliationDashboard.tsx`: add “Trigger New Reconciliation” (disabled + tooltip is acceptable).
31. Run TypeScript check / build locally if you have a runnable app; fix any type errors.
32. Re-read the three files once more against Tasks 3a–3c checklist from the brief.

## Task 4 — AI usage journal

33. List every AI tool you used (name + version if relevant).
34. Fill the interaction log table: prompt, quality 1–5, accepted/partial/no, reasoning.
35. Document AI-found bugs you verified, and AI mistakes or misses.
36. Document AI-generated code you rejected or heavily changed, with reasons.
37. Write the “moment you doubted AI” and “what you know that AI doesn’t” sections.
38. Create `AI_JOURNAL.md` at the repo root using the **exact** template structure from the assessment.

## Submission

39. Create a public GitHub repo named `fintrack-assessment-[yourname]`.
40. Commit work in **small incremental commits** (not one squashed dump at the end).
41. Confirm the repo contains: `CLARIFICATIONS.md`, `AUDIT.md`, `AI_JOURNAL.md`, and the three updated source paths.
42. Confirm you **attempted at least 3 of 4 tasks** before considering it done.
43. Share the public repo URL with the assessor.
