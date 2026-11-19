# AWS Billing Pipeline — Milestone Plan

**Goal:** Build a reliable, testable, multi-tenant usage-metering and billing backend without unnecessary infrastructure.

**Build order:** Finish Kafka → MySQL persistence + transactional idempotency → correctness tests + metrics → REST API + dashboard → Docker packaging.

**Core stack:** Java 25, Spring Boot, Kafka / Redpanda, Python (`confluent-kafka`), MySQL, `BigDecimal`.

**Scope decisions:**
- **MySQL** is the system of record for processed events, usage, charges, and invoices.
- **Redis is deferred** unless benchmarks or a concrete requirement justify it.
- **ClickHouse / a separate time-series database, Kubernetes, and ML anomaly detection are out of scope.**
- **Docker packaging is last.** An existing local Redpanda Compose setup may continue to support development; containerizing the whole project is a separate final milestone.
- **Dashboard work begins only after the core engine is correct and measured.**

> **Checklist note:** Completed foundational tasks below are carried forward from the original milestone plan and the current repository. A feature being *configured* is not the same as its failure behavior being *verified*; runtime validation remains unchecked.

---

## Completed foundations — Retained from the original plan

- [x] **F1 — Core Java domain and calculations.** Immutable usage DTO/model, parsing, service-specific processing, `BigDecimal` pricing, and defined rounding behavior.
- [x] **F2 — Spring-managed service registry.** Spring Boot components and injection-based service dispatch.
- [x] **F3 — Synthetic usage generation.** Python producer emits AWS-style usage events with UUID event IDs for 20 simulated tenants and five services.
- [x] **F4 — Kafka ingestion.** Spring Kafka listener consumes records and routes events through the processing pipeline.
- [x] **F5 — In-memory processing.** Per-tenant/per-service aggregation and provisional `HashSet` duplicate detection; **neither is durable**.
- [x] **F6 — Error-handler configuration.** `DefaultErrorHandler`, retry/backoff policy, DLT publishing for eligible processing failures, and special handling for deserialization failures are present in code.
- [x] **F7 — Local Kafka environment.** Redpanda-based local setup listed as completed in the original milestone file.
- [x] **F8 — Initial file-based validation.** Original plan marks generated JSON-lines processing and Python sum comparison complete; retain the script for later reconciliation.

**Important current-code note:** The repository's `application.properties` uses `spring.kafka.listener.ack-mode=record`, **not manual acknowledgment**. The old milestone plan's claim about manual ack was inaccurate. Record-level commits and recovery semantics still need integration tests.

---

## Phase 1 — Finish Kafka reliability **(CURRENT)**

Keep concurrency at **1** and focus on predictable behavior before adding a database.

- [x] **M1.1 — Ingestion path.** Python generator → Kafka / Redpanda → Spring Boot consumer → service handlers.
- [x] **M1.2 — Retry and DLT configuration.** Retry/backoff and dead-letter handling are implemented in configuration.
- [ ] **M1.3 — Validate successful processing and offset behavior.** Confirm the consumer advances offsets only after the processing method completes successfully (or an explicit recovery action completes).
- [ ] **M1.4 — Exercise failure categories.** Test malformed JSON, invalid or unknown service codes, retryable processing exceptions, and exhausted retries. Verify which records are skipped, retried, or routed to DLT.
- [ ] **M1.5 — Restart/recovery check.** Stop and restart the consumer during a stream; record which messages replay and verify expected behavior. Durable duplicate prevention is handled in Phase 2.
- [ ] **M1.6 — Clean up status messages.** Remove database-insertion log messages until events actually persist in MySQL; make failures and duplicate detection observable in logs.

**Exit criteria:** A valid event processes correctly, a bad event follows a documented failure path, and tests demonstrate what happens to its Kafka offset. No new message topics or async branch are required for this phase.

---

## Phase 2 — MySQL persistence + transactional idempotency

This phase turns the event-processing demo into a **durable billing engine**.

- [ ] **M2.1 — Define the schema.** Create MySQL tables for processed usage events, charge records, and tenant/service billing summaries; add invoice tables when invoice generation is implemented.
- [ ] **M2.2 — Preserve financial precision.** Map Java `BigDecimal` to appropriate MySQL `DECIMAL` columns; document charge precision and rounding rules.
- [ ] **M2.3 — Enforce database-backed deduplication.** Add a unique constraint or primary key for `event_id`; replace the in-memory set as the authoritative duplicate check.
- [ ] **M2.4 — Use one transaction for billing effects.** Register the event and apply its charges/usage updates atomically. Duplicate events must not change balances; partial failures must roll back.
- [ ] **M2.5 — Integrate Kafka completion with DB commit.** Treat successful DB commit as the point after which consumption can complete. Keep retry/DLT handling for failed transactions; never consider an event processed before its database writes succeed.
- [ ] **M2.6 — Persist and query billing data.** Generate per-tenant/per-service usage totals and simple invoice/charge summaries from stored data (rather than relying on process memory).
- [ ] **M2.7 — Prove replay safety.** Replay the same `event_id` multiple times, including after restarting the application. Assert one charge effect and consistent balances.

**Exit criteria:** A valid Kafka usage event creates a durable, correctly calculated MySQL billing record. Replaying it never generates another charge. A failure midway through processing leaves no partial billing updates.

> **Correctness boundary:** Kafka and MySQL do not share a single transaction in this design. Kafka delivery can be at least once; the **billing effects** are made effectively once via database uniqueness and transactional updates.

---

## Phase 3 — Correctness tests, reconciliation + metrics

Do this **before** building a dashboard or introducing more infrastructure.

- [ ] **M3.1 — Unit tests.** Validate pricing, rounding, parser validation, and service-specific calculations (including zero/invalid usage where applicable).
- [ ] **M3.2 — Integration tests.** Exercise Kafka → Spring Boot → MySQL, duplicate delivery, transient database errors, DLT behavior, and application restarts.
- [ ] **M3.3 — Reconciliation.** Extend the original Python verification script: compare successfully accepted input events against MySQL charge/usage totals and invoice totals. Exclude or separately report rejected/DLT events; explain all differences.
- [ ] **M3.4 — Multi-tenant isolation.** Check that tenants and services cannot affect each other's usage totals or invoices.
- [ ] **M3.5 — Baseline metrics.** Measure events/second, processing latency (e.g., p50/p95), counts of duplicates, failures, retries and DLT records; inspect consumer lag.
- [ ] **M3.6 — Publish honest results.** Record dataset size, number of tenants, test environment, results, and known bottlenecks in the README or a short benchmark report.

**Exit criteria:** Repeated delivery and restarts do not change billed totals; tests pass; there is a reproducible baseline with recorded measurements. No fabricated performance claims.

---

## Phase 4 — REST API + focused dashboard

Expose the proven engine rather than expanding its architecture.

- [ ] **M4.1 — Read APIs.** Add endpoints for tenant usage, charges, billing summaries, and invoices. Add basic input validation, pagination or date filtering where useful.
- [ ] **M4.2 — Backend/API tests.** Ensure results match MySQL records and do not mix tenants.
- [ ] **M4.3 — Minimal dashboard.** Display tenant usage by service, charges, invoice summaries, and a few key pipeline metrics.
- [ ] **M4.4 — End-to-end demo.** Publish simulated events, observe persisted charges, retrieve them through the API, and view them on the dashboard.

**Exit criteria:** An end-to-end demo tells the story clearly: event → Kafka → billing transaction → MySQL → API → UI.

---

## Phase 5 — Docker + project polish **(LAST)**

- [ ] **M5.1 — Package the application.** Add a production-appropriate Dockerfile for Spring Boot, and package the generator/dashboard only if useful for the demo.
- [ ] **M5.2 — Compose environment.** Bring up app, Kafka/Redpanda, and MySQL with Docker Compose; add the dashboard if needed.
- [ ] **M5.3 — Re-run the validation suite.** Execute the normal, duplicate, failure/recovery, and reconciliation scenarios in the packaged environment.
- [ ] **M5.4 — Documentation.** Finalize setup commands, architecture diagram, tests, benchmarks, limitations, and screenshots/demo guidance.

**Exit criteria:** Another developer can start the project, send sample events, and reproduce the billing results with clear instructions.

---

## Optional work — Only if evidence justifies it

These are **not prerequisites** for calling the core project complete:

- **Redis:** only for a demonstrated performance/use-case requirement. Do not introduce a Redis/MySQL dual-write correctness problem for deduplication.
- **Higher Kafka consumer concurrency:** only after single-consumer correctness and a benchmark baseline; preserve transactional deduplication and tenant-safe updates.
- **Prometheus/Grafana or a separate analytics topic:** only if the simple metrics already collected prove inadequate for the demonstration.
- **More advanced invoicing/reconciliation:** only after the base invoice and charge totals are validated.

**Explicitly dropped from this project plan:** ClickHouse / independent time-series storage, Kubernetes deployment, ML anomaly detection, and mandatory async fan-out.

---

## Definition of done

- [ ] **Correct:** exact decimal-based charges and tenant isolation.
- [ ] **Durable:** MySQL stores usage, charges, and invoice summaries.
- [ ] **Idempotent:** Kafka replays never double-charge.
- [ ] **Recoverable:** failures and offsets behave as documented.
- [ ] **Tested:** automated tests plus reconciliation pass.
- [ ] **Measured:** credible baseline throughput, latency, error, and retry/DLT metrics.
- [ ] **Usable:** REST API and simple dashboard demonstrate the pipeline.
- [ ] **Reproducible:** Docker Compose and setup instructions work.

**Next immediate action:** finish and verify Kafka's failure/offset behavior, then implement MySQL-backed billing transactions and unique event-ID handling. Do not introduce new infrastructure until these milestones are stable.