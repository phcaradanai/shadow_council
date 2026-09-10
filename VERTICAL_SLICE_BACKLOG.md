# First vertical slice — worker contracts

Status: Completed & Verified via Real Playwright Browser E2E Automation; Ready for 4-Player Human Playtesting (2026-09-10). The vertical slice is verified across isolated Chromium browser contexts for Journeys A–F and hidden-information confidentiality. HTTP integration tests are categorized under tests/integration/, and CI workflow is established with required blocking gates.

All workers obey the import matrix, source-size governance, and rule matrix. Owned paths include colocated tests unless noted. A new dependency, cross-owner change, or contract deviation requires lead review. Workers report behavior, test evidence, and unresolved risks. Listed durations are deliberately omitted; scope and dependencies define task size.

## W0 — Workspace and guardrails

- Objective: establish a reproducible skeleton with enforceable dependency and size checks.
- Owns: root package/lockfile/configs, per-package manifests/tsconfigs, scripts/, CI, architecture-check fixtures; empty public entry points only. Propose source/cache ignore rules. Git initialization is a separate repository setup choice.
- Allowed dependencies: approved build/test/lint tools; no game libraries or production features.
- Acceptance: named lint/typecheck/unit/scenario/build/architecture commands; standalone domain command; pinned compatible versions; size exclusions/waivers explicit. Negative fixtures prove cycle, boundary, any, and size violations fail. Do not add empty-suite success flags that later hide missing tests.
- Tests: checker fixtures; compile/package boundary smoke check. E2E job becomes required with W6, not falsely reported passing now.
- Non-goals: rules, UI, authentication, deployment, database.
- Depends on: Phase 0 acceptance.

## W1 — Freeze executable contracts

- Objective: turn approved document contracts into narrow types and boundary schemas for independent workers.
- Owns: domain model/commands/events/errors/index declarations and random interface/spec vectors; application ports/public input-output declarations; protocol DTOs/schemas/index; canonical public/private projection fixtures.
- Allowed dependencies: domain internals only for domain; domain for application; boundary schema library for protocol. No cross-layer shortcut exports.
- Acceptance: phase union cannot express missing pending Strike; intent omits trusted actor/outcomes; result/event envelopes defined; port signatures support serialized room commits, deduplication, clock/scheduler, and credentials. Specify RNG algorithm, seed normalization, bounded sampling and golden vectors. Define exact DTO-to-application mappings, phase tokens, error codes, legal-intent representation, and projection examples matching all documents.
- Tests: valid/invalid wire payload parsing; compile-time forbidden phase shapes; fixture schema checks. No gameplay placeholder that returns success.
- Non-goals: engine behavior, storage implementation, endpoints, UI, generic event/rule framework.
- Depends on: W0; lead reviews contracts before W2–W6 consume them. Consumers request amendments through W1 ownership.

## W2 — Domain lifecycle and randomness

- Objective: implement deterministic setup, turn queue, Recover, Pass expiry, and terminal validation.
- Owns: domain/engine/setup and turn-advance modules; domain/random implementation; rules/recover and victory; lifecycle tests.
- Allowed dependencies: domain contracts and local pure modules only.
- Acceptance: seeded setup for 2–6 players; bounded balances; skip eliminated queue entries; exact round events; sole-survivor evaluator; pure RNG with documented vectors; rejected commands do not mutate state. Export helpers agreed by W1 for W3 integration.
- Tests: setup rejection, shuffle vectors, Recover cap, timeout pass, round rollover, skipped seats, victory and immutable input.
- Non-goals: Strike/react resolution, IO, timers, domain dispatcher ownership, alternate victories.
- Depends on: W1.

## W3 — Bluff exchange and engine integration

- Objective: implement the six-case Strike matrix and wire the complete domain command reducer.
- Owns: rules/strike, rules/legal-intents, engine/decide; exchange/reducer tests; domain match stories in tests/scenarios/domain/.
- Allowed dependencies: domain contracts, W2 lifecycle/random/rule helpers; test-only scenario fixtures.
- Acceptance: secret commitment frozen; target-only reaction; correct cost/reveal/damage/elimination ordering; expiry Yield; exact revision/phase-token behavior; genuine and bluff routes reach round rollover and victory. Legal intents use the same validators as execution.
- Tests: all six outcomes; wrong phase/actor/target/funding; insufficient resources; challenged attacker death; target death; replay with expiries; invariants over fixed seeded command sequences.
- Non-goals: lobby, transport, presentation, additional actions, alternate victory rules.
- Depends on: W1; Strike work may start alongside W2, but reducer/scenario completion requires W2.

## W4a — Rooms and membership use cases

- Objective: implement room creation/join/leave/start authorization and frozen match membership.
- Owns: application/rooms/ and its tests.
- Allowed dependencies: application contracts/ports and domain public setup API; injected fake ports in tests.
- Acceptance: capacity and unique membership enforced; host start requires 2–6 connected members; host transfer in lobby; concurrent starts serialized; started room rejects joins; reconnect retains seat; no raw credentials returned in room views.
- Tests: unauthorized start, full room, duplicate requests, concurrent join/start, host departure, reconnect, roster freeze.
- Non-goals: actual crypto/network/store adapters, domain rule changes, accounts, rematch.
- Depends on: W1; final StartMatch integration needs W2.

## W4b — Match orchestration and private projections

- Objective: apply authenticated intents atomically and expose only permitted state.
- Owns: application/matches/, application/views/, tests/scenarios/application/.
- Allowed dependencies: application ports and domain public operations/queries. No server, framework, or protocol imports.
- Acceptance: serialized command path binds actor; checks match/revision; deduplicates before deadline logic; commits state/journal/receipt/events/deadline together; stale timers inert; precise deadline policy; attacker-only funding before reveal; everyone gets public result afterward.
- Tests: fake-clock boundary races, exact/conflicting retry, stale revision/match, delivery failure, hidden-state absence across viewer roles and errors, unchanged deadlines on reconnect, replay journal equivalence.
- Non-goals: endpoints, persistent database, event broker, client state, balancing.
- Depends on: W1; can develop projections and orchestration against fixtures alongside W2/W3; real-engine acceptance requires W3.

## W5 — In-memory server and transport

- Objective: connect real browser intents and SSE snapshots to the application.
- Owns: apps/server/, transport integration tests; server-only runtime dependencies proposed through W0 owner.
- Allowed dependencies: application API/ports, protocol schemas, Node APIs and minimal server libraries if justified; no rule imports in transport/adapters.
- Acceptance: create/join/start/intent/view/stream endpoints; credential cookie and origin protection; serialized memory adapter; cancellable scheduler; per-member projection delivery; snapshot subscription without gaps; errors contain no secrets; startup command documented. Validate body size and schema before application dispatch.
- Tests: real HTTP schema/identity/CSRF checks, correct cookie seat mapping, cross-room denial, SSE privacy, reconnect snapshot, commit despite disconnected stream, timer integration without long sleeps.
- Non-goals: database, cloud setup, scale-out, accounts, raw state debug endpoints, gameplay logic.
- Depends on: W1 for adapter/transport work; full integration requires W4a/W4b.

## W6 — Playable browser client

- Objective: let humans complete the approved loop using authoritative views.
- Owns: apps/web/ plus component/client tests. Root dependency changes coordinated with W0 owner.
- Allowed dependencies: protocol and presentation libraries only; approved projection fixtures for development.
- Acceptance: room create/join/start; thin GameScreen composes PlayerArea, RoundStatus, ActionSelector, ReactionPanel, RevealSequence; only eligible controls shown from supplied legal intents; concealed funding never inferred from raw state; ordered reveal; pending/error/reconnect/finished states. Submit intent once, retry with same command ID if needed, reconcile revisions, never apply calculated damage locally. Render a deadline but never expire domain state locally.
- Tests: intent serialization; stale snapshot/event handling; role-specific controls using fixtures; retry ID stability; reveal order. Do not reproduce rule matrices in UI tests.
- Non-goals: UI rule engine, prediction, fancy effects, content system, spectators beyond eliminated members, rematch, mobile-native app.
- Depends on: W1 for fixture-driven work; real-server validation needs W5. Visual design work should follow the applicable frontend skill when dispatched.

## W7 — Acceptance and playtest handoff
- Objective: demonstrate the integrated slice and assess architectural integrity.
- Status: COMPLETED & VERIFIED.
- Owns: tests/e2e/ (`browser-journeys.spec.ts`, `hidden-information.spec.ts`), tests/integration/ (`http-multiplayer.test.ts`), `PLAYTEST.md`, `.github/workflows/ci.yml`.
- Acceptance evidence:
  - Real Playwright browser automation verifies Journeys A through F across isolated Chromium contexts.
  - Hidden information protection verified in browser DOM and sessionStorage for both Target and Bystander.
  - Zero default bluff bias enforced: Declare Strike requires deliberate target and commitment selection.
  - HTTP integration suite reclassified under `tests/integration/` to preserve truthful evidence claims.
  - Non-negotiable GitHub Actions CI workflow established with zero `continue-on-error`.
  - 4-player facilitator playtest protocol and metrics template established in `PLAYTEST.md`.
- Next step: Run the first 4-player human playtest (no new gameplay features).

## Safe parallel work

1. W0, then W1 and its contract review, are sequential gates.
2. After W1, W2, W3's isolated Strike rules, W4a, W4b's projections/orchestration fixtures, W5's adapters/transport mapping, and W6's fixture-driven UI can run in parallel within available worker capacity. They own disjoint paths; no one edits shared contracts independently.
3. W3 integrates after W2; W4a integrates setup after W2; W4b integrates the engine after W3. W5 then validates against both application workers. W6 validates against W5.
4. W7 finishes after integration. Do not call a fixture-only worker result an end-to-end completed slice. Schedule at most the available workers; parallel eligibility does not require running all tasks simultaneously.
