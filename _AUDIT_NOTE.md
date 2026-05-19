# Audit Note — AICobotTrainer

Source: `_AUDIT/reports/batch_01.md` (Project 28)

## Maturity: PARTIAL-BUILD (18 routes; audit reports 0 AI endpoints, but 8 ai* route files exist)

## Original audit recommendations

### Gaps & Opportunities
- Missing AI Layer (audit asserts 0 AI endpoints).
- Missing Notifications.
- Missing Reporting.
- Missing Integration API.

### Strategic Feature Suggestions
1. Agentic Workflow Orchestration
2. RAG over Domain Documents
3. Real-time Anomaly Detection
4. White-label/Reseller Platform

## Categorization
- **MECHANICAL:** notifications, webhooks. (Reporting partially covered by existing dashboard.js.)
- **NEEDS-PRODUCT-DECISION:** agentic, RAG over robotics SOPs, white-label.
- The "missing AI layer" claim appears wrong — `aiMotionPlanning.js`, `aiAnomalyDetection.js`, `aiQualityAnalysis.js`, `aiSafetyAssessment.js`, `aiTaskOptimization.js`, `aiNlProgramming.js`, `aiPredictiveMaintenance.js`, `aiAdvanced.js` all exist as route modules.

## Implementations applied
1. **`backend/routes/notifications.js`** — full CRUD with DB-detect + memory fallback.
2. **`backend/routes/webhooks.js`** — registry CRUD + manual test-delivery.
3. **`backend/server.js`** — mounted at `/api/notifications` and `/api/webhooks`.

Syntax-checked with `node --check`.

## Backlog (prioritized)

### High priority
- **Real-time anomaly stream (SSE)** wired to `/api/ai-anomaly-detection`.
- **Outbound webhook dispatch** triggered by safety-boundary breaches and quality-checkpoint failures.

### Medium priority
- **CSV export** endpoints for programs, demonstrations, work-cells.
- **RAG over robot SOPs / safety manuals** — needs vector DB + ingestion pipeline.

### Low priority
- White-label per-factory branding.
- Agentic training-program generator that synthesizes demonstrations into task sequences.

## Apply pass 3 (frontend)

- Action: LEFT-AS-IS.
- Frontend was already comprehensively wired to every AI route. `frontend/src/features.js` declares the 8 AI features and renders them via the generic `FeaturePage.jsx`; `AIAdvancedPage.jsx` covers the multi-action `/ai-advanced/*` endpoints; pass-2 `Notifications.jsx` and `Webhooks.jsx` pages are routed in `App.jsx`.
- Auth pattern: `frontend/src/api.js` axios instance attaches `Authorization: Bearer <localStorage.token>` and redirects to `/login` on 401. Backend errors (including 503 no-key) propagate via axios and render as inline error messages.
- Log: `_AUDIT/apply3_logs/ab3_63.md`.

## Apply pass 4 (mechanical backlog)

- Action: ALREADY-IMPLEMENTED (this pass found work in place; documenting it).
- Backend: `backend/routes/aiAdvanced.js` already contains 4 backlog-driven LLM endpoints with `requireAiKey` 503-on-no-key guards (cap 5):
  1. `POST /api/ai-advanced/agentic-program-generator` — synthesise demonstrations into a task sequence.
  2. `POST /api/ai-advanced/failure-root-cause` — root-cause analysis for an anomaly record.
  3. `POST /api/ai-advanced/cycle-time-estimator` — estimate cycle time + bottlenecks for a sequence.
  4. `POST /api/ai-advanced/operator-training-brief` — generate operator training brief for a program.
- Frontend: `frontend/src/pages/AIAdvancedPage.jsx` already wires each as a tab, posting via the existing `api` axios instance which attaches `Authorization: Bearer <localStorage.token>`; non-OK (incl. 503) surfaces in the inline error block.
- Backlog deferred:
  - SSE anomaly stream + outbound webhook dispatch on safety/quality breaches — non-LLM mechanical, do not match pass-4 LLM-endpoint shape; left for a dedicated infra pass.
  - CSV exports for programs/demos/work-cells — non-LLM mechanical, deferred.
  - RAG over robot SOPs, white-label per-factory branding — NEEDS-PRODUCT-DECISION.
- Smoke test: deferred (`start.sh` requires PostgreSQL); `node --check` previously confirmed by the earlier pass.
- Log: `_AUDIT/apply4_logs/ab3_63.md`.
