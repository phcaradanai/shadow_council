# Test strategy

Priority: fast domain checks, then readable headless scenarios, then a few browser journeys. No browser, server, network, database, or runtime framework is required to test the domain. Vitest is a development test runner, not a domain dependency.

## Domain tests

Cover all six Strike/reaction matrix cells with exact balances and ordered events. Also cover zero funding, insufficient Power, invalid/noninteger funding, self/dead/unknown target, wrong actor/phase, Guard without Power, Recover at cap, clamped damage, elimination of attacker and target, skipped queue seats, round rollover, and sole-survivor victory.

Test rejected decisions against frozen inputs: same state, no events, unchanged RNG cursor. Verify one revision increment per accepted command, one turn advance, finished-state rejection, stale expiry rejection, and legal-intent queries agreeing with command validators. Test seeded shuffle golden vectors and replay equivalence using explicit RNG algorithm version. Domain tests use no sleeps or real clock.

## Headless scenarios

Write ordinary Given/When/Then test descriptions and small fixture builders, not a custom scenario DSL.

- Four-player setup -> bluff -> Guard -> reveal -> next turn -> complete round.
- Genuine Strike -> Challenge -> elimination -> skipped seat -> eventual victory.
- Challenged bluff eliminates attacker; next turn and winner are correct.
- Recover increases Power; subsequent funded Strike spends exactly one.
- Same setup/seed/accepted command journal, including timeout commands, yields identical final state and event sequence.
- Table-driven invariants across 2–6 seats and a fixed set of seeded legal command sequences. Scripts choose legal commands for testing; no game AI implementation.

Application scenarios use a fake clock, fake scheduler, memory store, and explicit credentials. Cover exact-deadline behavior, duplicate receipt, conflicting reused command ID, stale revision, mismatched match ID, concurrent start/commands, obsolete timer, failed delivery after commit, and reconnect without extending deadlines. Ensure one accepted mutation for a racing pair.

Projection tests compare views for attacker, target, bystander, eliminated member, and non-member before/after reveal. Assert funding appears only for its owner before resolution and publicly afterward. Assert seed, credentials, RNG state, and private journal are absent recursively. Check HTTP errors and SSE payloads as well as snapshots; projection tests are a release gate.

## Integration and E2E

Transport integration verifies schema rejection, cookie identity/authorization, CSRF boundary, DTO mapping, per-member SSE snapshots, revision ordering, and fresh snapshot on reconnect. Exercise real application/domain with in-memory storage. Do not test game-rule matrices through HTTP.

Browser E2E: isolated browser contexts create/join a room, host starts, attacker sees private commitment, target Guards, everyone sees reveal and updated balances, round rolls over. A second short journey completes a match and verifies finished controls. Reconnect one context to confirm recovery. Keep all other business-rule coverage headless. Rematch E2E is added only when rematch is implemented; it is not in this first slice.

## CI plan (implemented by W0, expanded by owning tasks)

| Check | Tool / purpose |
| --- | --- |
| Reproducible install | npm ci against committed lockfile and pinned supported Node runtime. |
| Lint + formatting | ESLint, typescript-eslint typed safety rules, Prettier check. Disallow explicit any and unsafe uses. |
| Typecheck | tsc with strict package configs; domain uses ECMAScript libs only, no ambient Node/DOM types. |
| Unit | Vitest Node environment; domain runnable as its own workspace command. |
| Scenarios/integration | Separate Vitest projects so business scenarios need no running server/browser. |
| Dependencies | dependency-cruiser fails cycles, unresolved imports, disallowed matrix edges (including type imports), and external production imports in domain. Use one graph tool. |
| Forbidden globals | ESLint restrictions for ambient randomness/time/IO in domain; Math.random forbidden for gameplay across all source. |
| Source size | Small repository script with exact exclusions/waivers from CODE_STANDARDS. |
| Build | Compile domain/application/server and build web; browser artifact must not include domain/server packages. |
| E2E | Playwright for critical flows once W6 lands; run against built app and one local server. |

W0 proves the architecture checks with temporary violation fixtures: cross-layer import, cycle, framework import in domain, any, and oversized maintained source must fail. Fixtures live outside production source and run in checker tests. Do not rely on a green check against an empty graph. A standalone domain build/test command must remain available as later layers arrive.

No global coverage percentage in Phase 0. Require the rule matrix, rejection paths, determinism, authority, privacy, and timing cases explicitly; coverage reports can identify gaps without rewarding meaningless tests. Do not add snapshot tests that merely duplicate implementation output.
