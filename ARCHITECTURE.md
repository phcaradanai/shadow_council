# Architecture

Status: Implemented and Verified with Playwright Browser E2E. See [ADR 001](ADR/001-initial-architecture.md).

## Repository status & architecture

The architecture implements a clean hexagonal structure with strict unidirectional dependencies:
- **`packages/domain`**: Pure, deterministic state machine (Strike, Recover, Reaction, Elimination, Victory). Ambient randomness and I/O strictly forbidden.
- **`packages/application`**: Room and match orchestration, state projection, role-based secret stripping, command idempotency, and session tokens.
- **`packages/protocol`**: Shared wire contracts, JSON schemas, protocol versioning, and DTO types.
- **`apps/server`**: Node.js HTTP/SSE server, cookie-based session management, static asset delivery, and routing.
- **`apps/web`**: Zero-bundler modular vanilla TypeScript compiling to native browser ES modules (`type="module"`).
- **`tests/`**: Multi-tiered verification separating unit tests, scenario tests, HTTP integration tests (`tests/integration/`), and real multi-context browser journeys (`tests/e2e/`).

Pin mutually compatible tool versions and a supported Node LTS at W0, with one lockfile; do not select unverified floating versions. TypeScript's [strict options](https://www.typescriptlang.org/tsconfig/) and [unchecked indexed access option](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html) support the proposed compiler checks. Use the official [Node release table](https://nodejs.org/en/about/previous-releases) to select the runtime. [Vitest](https://main.vitest.dev/guide/features) supplies TypeScript test support; [dependency-cruiser](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md) supplies forbidden-import and cycle checks. These sources were checked during Phase 0; tool installation is deferred.

## Proposed structure (create only as tasks need it)

```text
/
  PRODUCT_VISION.md, GAME_RULES_MVP.md, DOMAIN_MODEL.md
  ARCHITECTURE.md, CODE_STANDARDS.md, TEST_STRATEGY.md
  MATCH_STATE_MACHINE.md, VERTICAL_SLICE_BACKLOG.md
  ADR/001-initial-architecture.md
  packages/
    domain/src/
      model.ts, commands.ts, events.ts, errors.ts, index.ts
      engine/                 # setup, dispatch, turn advancement
      rules/                  # strike, recover, victory, legal intents
      random/                 # interface, pinned seeded implementation
    application/src/
      rooms/                  # membership and lobby operations
      matches/                # command handling and deadlines
      views/                  # explicit per-member projections
      ports/                  # store, clock, scheduler, credentials
      index.ts
    protocol/src/             # JSON DTOs, runtime schemas, version
  apps/
    server/src/
      transport/              # HTTP routes, SSE, wire mapping
      adapters/               # memory store, timers, crypto credentials
      main.ts                 # composition root only
    web/src/
      client/                 # requests, SSE, snapshot reconciliation
      screens/                # RoomScreen, GameScreen
      components/             # PlayerArea, RoundStatus, ActionSelector,
                              # ReactionPanel, RevealSequence
  tests/scenarios/             # headless match/application stories
  tests/e2e/                   # minimal browser journeys
  scripts/                     # source-size checks
  .github/workflows/            # CI, if hosted on GitHub
```

Unit tests sit beside owned modules. Root configs and package manifests belong to the foundation worker. No empty placeholder package trees in Phase 0.

## Import boundaries

| Importing module | Allowed production dependencies |
| --- | --- |
| domain | Its own files and ECMAScript primitives only; no Node/browser APIs, frameworks, runtime packages, application, protocol, or IO |
| application | domain public entry point and its own modules; no server/web/protocol imports or frameworks |
| protocol | Own DTO/schema modules and a boundary schema library (proposed Zod); no domain/application/server/web imports |
| server/transport | application public API and protocol; no direct domain rule calls |
| server/adapters | application ports and necessary Node/runtime libraries; no gameplay decisions |
| server/main | Composition imports for wiring; no gameplay logic |
| web | protocol, React and presentation libraries; no domain, application, server, or raw authoritative state |

Protocol duplication is deliberate: small wire types do not export secret-bearing domain structures. Transport maps parsed DTOs to application inputs; mapping has no damage, eligibility, or victory logic. The browser reaches application through HTTP, preserving the logical presentation -> application -> domain direction. Type-only imports must obey the same boundaries. Domain unit tests may import test tools; production domain must not.

## Authority and delivery

- Parse untrusted JSON as unknown at transport; schema checks validate shape. Domain validates legality, resources, timing phase, and outcomes. Application authenticates, authorizes, sequences, and commits.
- Client envelope: protocolVersion, roomId, matchId for gameplay, commandId, expectedRevision, phaseToken, and intent. Actor comes from server membership, never a trusted supplied player ID.
- Use opaque room-scoped membership tokens via same-origin HttpOnly cookies, with secure flags in hosted environments and same-origin/CSRF protection for mutations. Room invite codes identify a room but cannot impersonate seats. Allow multiple rooms through server session mappings. No account system.
- Store ports expose serialized room operations; W1 defines exact queue/transaction signatures. All start and match writes use that path. Deduplicate by membership + commandId; preserve receipts for room lifetime. Wrong-match and stale-revision requests cannot mutate the current match.
- Clock, scheduler, credential generator, and in-memory store implement application-owned ports. RandomProvider is separately domain-owned. Do not inject transport objects into use cases.
- Every response and SSE update is built from a whitelisted member projection. Never spread raw MatchState into JSON, including errors. Only the attacker sees pending funding. Nobody receives seed, random state, credentials, journal, or another player's private projection.
- Send a full permitted snapshot with revision and optional ordered event batch. Initial subscribe/reconnect sends current snapshot. Subscribe/snapshot delivery is serialized with room updates to prevent a gap. Clients ignore older revisions and deduplicate event IDs; identical snapshots are harmless.
- SSE is delivery, not correctness: if delivery fails, persisted in-memory state remains committed. Reconnect recovers current state; complete animation history is not guaranteed. Do not implement a durable outbox.
- Store lifetime is server-process lifetime. An unknown room after restart is reported explicitly. No durable replay promise: internal journals can reproduce matches during playtests; exporting them is future authorized tooling.

## Growth constraints

Keep room orchestration, projections, rules, and transport independently testable. Add local rule modules when needed, not a universal action framework. A second victory rule motivates a small evaluator composition then. New phases, simultaneous actions, persistence, or protocol changes need an ADR with migration and test implications. Nothing here assumes horizontal scale.
