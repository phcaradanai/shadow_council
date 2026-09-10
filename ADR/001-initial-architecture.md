# ADR 001 — Deterministic engine inside a modular monolith

Date: 2026-09-08

Status: Accepted and Implemented. Verified through headless unit/scenario suites, HTTP integration tests, and multi-context Playwright browser E2E.

## Context

The workspace has no existing application. The immediate uncertainty is whether a small bluff interaction is fun. The engine must run and be tested without UI, networking, storage, or frameworks. Private commitments require an authoritative server and intentional projections.

## Decision

Use strict TypeScript in a workspace repository. Separate domain, application, wire protocol, server adapters, and browser presentation. A single Node LTS process hosts an in-memory modular monolith. React/Vite is a replaceable client; HTTP commands and SSE updates are sufficient for the first sequential loop.

The domain returns immutable state and ordered events from explicit commands. Inject deterministic seeded randomness through a pure RandomProvider; persist its state and version with server-only match data. Application owns identity, serialized room mutations, deduplication, deadlines, storage ports, and views. Adapters contain no gameplay decisions.

Persist only ACTIVE_TURN, REACTION, and FINISHED as match phases. Setup and reveal/resolution/round advancement are atomic work. Start with concrete Strike, Recover, and sole-survivor rules, not registries. [MVP rules](../GAME_RULES_MVP.md) remain provisional balance/design decisions separate from architectural acceptance.

## Alternatives considered

- Client-authoritative rules: rejected because hidden state and validated outcomes cannot be trusted to opponents' clients.
- Full-stack framework coupling: adds no required value to the domain; keep web/server edges replaceable.
- Event sourcing, broker, microservices, database first: rejected for this slice; replay uses accepted commands and explicit random state without distributed coordination.
- Generic action/victory plugin engine: rejected until multiple implemented rules demonstrate the needed shared contract.
- WebSockets and simultaneous rounds immediately: deferred; neither is needed to test one attacker/target bluff exchange.

## Consequences

The engine is independently testable and suitable for deterministic simulations. Server/client types require small explicit mappings, and private projections require dedicated tests. In-memory matches and journals disappear on restart. Timer decisions depend on authoritative processing order but reproduce through recorded expiry commands. Sequential play and repeated defensive choices may expose pacing problems; playtests must decide before more content.

Revisit this ADR when durable matches, a second victory condition, simultaneous resolution, or measured transport/scale needs appear. Do not add those systems just because they are plausible future features.
