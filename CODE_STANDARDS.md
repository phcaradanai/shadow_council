# Code standards and governance

Implementation workers follow [ARCHITECTURE.md](ARCHITECTURE.md), [DOMAIN_MODEL.md](DOMAIN_MODEL.md), and their backlog ownership. Architectural or gameplay contract changes require lead-architect review before integration. A worker may propose a change with evidence; silently redesigning another module is not permitted.

## Coding rules

- TypeScript strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitReturns, and exhaustive discriminated-union handling. Unknown at trust boundaries; no explicit any or unsafe assignment/member access/calls. Validate and narrow rather than cast around failures.
- Small cohesive functions and readonly domain data. All match mutations go through createMatch/decide and application commit operations. No writable module-global game state.
- Domain errors are typed results; infrastructure exceptions become application errors. Never leak raw errors/state to clients. Invalid commands leave state and RNG untouched.
- No domain framework, IO, Date.now/new Date, Math.random, crypto, process/env, timers, or browser globals. Inject time into application; route gameplay randomness through RandomProvider.
- Import packages through public exports, not another package's src paths. Avoid circular imports, service locators, and generic repositories with gameplay methods.
- Use integer game quantities and stable seat ordering. Do not encode decisions in display strings. Shared protocol carries intents/views, not rule implementations.
- Screens compose presentation components. Local state may handle selection, focus, and animations; eligibility and outcomes come from server-provided views. Never optimistically apply damage or reveal guesses.
- Format consistently with Prettier; ESLint handles correctness, not competing formatting rules. Comments explain invariants and tradeoffs. Keep rule tests close to their owner.
- No unrelated refactors, surprise dependencies, generated asset commits, or dependency/version changes outside task ownership.

## File-size policy

Count physical lines, including comments and blanks, in maintained source/test/config files (`ts`, `tsx`, `js`, `mjs`, `cjs`, `json` configs). Documentation is not source, but should stay concise.

| Lines | Enforcement |
| --- | --- |
| 0–300 | Normal. |
| 301–500 | CI warning; architectural review recommended. |
| 501–800 | Fail unless a lead-approved, file-specific justification exists; refactor preferred. |
| Over 800 | Architecture failure unless generated or an exceptional lead-approved waiver exists. |

W0 creates the size checker and waiver file. A waiver records exact path, observed/max allowed size, cohesive responsibility, reason splitting harms clarity, approver, and expiry/review date. CI rejects expired waivers and sizes above their maximum. Exceptional waivers above 800 need an ADR. Workers cannot approve their own waiver.

Exclude dependencies, caches (including graft), builds, coverage, lockfiles, generated declarations, machine-generated assets, and explicitly recorded generated paths. A handwritten source file is not exempt merely because a worker labels it generated. Generated outputs must have a documented source/generator. No broad exclusions covering maintained domain or UI source.

Split by responsibility: phase advancement versus action resolution; authentication versus room orchestration; projection versus transport serialization; screen composition versus interaction controls. Do not split into arbitrary numbered fragments to satisfy the counter. Passing the size check does not establish cohesion.

## Review gate

Each change states behavior, owned files, validation, and limitations. Review checks dependency direction, information exposure, deterministic behavior, invalid commands, phase timing, and scope. Require an ADR for boundary/contract changes; balance changes update rules plus affected tests. CI is required after W0, but human review still decides whether rules have leaked into UI or networking.
