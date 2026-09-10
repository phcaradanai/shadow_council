# Domain model and contracts

Status: proposed contracts; implementation task W1 freezes exact exported TypeScript declarations without changing semantics. Rules live in [GAME_RULES_MVP.md](GAME_RULES_MVP.md).

## Ownership

| Model | Owner | Contents |
| --- | --- | --- |
| Room | Application | Room ID/code, host seat, room settings (`turnTimerEnabled`, `turnTimeSeconds`), ordered members, lobby/playing/finished status, current match ID. Connection presence is session metadata. |
| Membership | Application | Opaque credential association to room/PlayerId; never gameplay state. |
| MatchState | Domain | Match ID, rules version, revision, phase, players, fixed seat order, round number, turn queue/cursor, phase token, random state. |
| PlayerState | Domain | PlayerId, Influence, Power. Alive is derived from Influence; no independent mutable alive flag. |
| PendingStrike | Domain | Attacker, target, funding 0 or 1; only present in REACTION. |
| MatchView | Application contract | Whitelisted public match fields plus only the requesting member's private pending choice, private Power balance (opponents' Power is omitted/undefined), and legal intent descriptions. |
| StoredMatch | Application | Domain state plus active deadline metadata, snapshotted room game settings, accepted command journal, and command deduplication receipts. |

Use distinct opaque IDs, readonly structures, integer balances, and discriminated unions. ACTIVE_TURN carries active player/queue; REACTION carries PendingStrike; FINISHED carries winner. Avoid an object with many optional phase-dependent fields. JSON-safe data only; no class instances, Date objects, sockets, or callbacks in state.

## Domain operations

`createMatch(setup, randomProvider) -> Result<Transition, RuleError>` validates 2–6 unique IDs and starting configuration, shuffles seats, and opens round one.

`decide(state, command, randomProvider) -> Result<Transition, RuleError>` is synchronous and deterministic. A Transition contains the new immutable state and an ordered readonly list of DomainEvents. One accepted command increments revision exactly once, including all automatic resolution steps. Initial match revision is 0. A rejected command leaves state, events, and RNG cursor unchanged.

Commands:

- `Strike(actorId, targetId, funding)` and `Recover(actorId)` in ACTIVE_TURN.
- `React(actorId, choice: guard | challenge | yield)` in REACTION.
- `ExpirePhase(phaseToken)` is application-only; domain validates the current token and applies Pass/Yield. It contains no wall-clock reading.

Client commands omit trusted actor identity; application supplies actorId from membership. Never accept damage, balances, truth verdicts, winner IDs, or complete state as client intent. Room operations (CreateRoom, JoinRoom, UpdateSettings, LeaveRoom in lobby, StartMatch, GetView, Reconnect) are application use cases, not match commands. Host departure in lobby transfers ownership to the earliest remaining member; empty rooms may be removed. Started rosters are frozen. No mid-match joining or seat replacement.

Typed errors include WrongPhase, NotYourTurn, InvalidTarget, InvalidFunding, InsufficientPower, PowerAtCap, and StalePhase. Transport errors such as Unauthenticated, StaleRevision, InvalidSettings, NotHost, and CommandIdConflict belong to application/protocol, not game rules.

## Events and visibility

All events have a stable `(matchId, revision, ordinal)` identity. Do not stamp domain events using time or generate random event IDs.

| Events | Payload / audience |
| --- | --- |
| MatchStarted, RoundStarted, TurnStarted | Public seat order, round, active player, phase token as appropriate. No seed. |
| ActionCommitted | Public attacker, target, action kind; omit funding. |
| ReactionCommitted | Public target and reaction choice; followed immediately by reveal/resolution. |
| ActionRevealed | Public attacker, target, funding, derived genuine/bluff verdict. |
| AttackResolved | Public costs, Influence losses; resulting Power is projected privately per viewer. |
| BluffSucceeded | Public attacker, target, outcome guard/yield; no extra mechanical effect. |
| PowerRecovered, TurnPassed | Public affected player; resulting Power is projected privately per viewer, or timeout reason. |
| PlayerEliminated, TurnEnded, RoundEnded, VictoryAchieved | Public affected player/turn/round/winner. |

Pending funding and opponent Power balances are protected by view projection (`projectMatchView`, `projectEventsForViewer`), not domain filtering. Domain produces authoritative transitions with full state; the application layer masks opponent Power (`power?: undefined`) and secret commitments before delivery across HTTP snapshots, SSE streams, and event logs.

## Determinism and invariants

RandomProvider is a domain-owned interface: `nextInt(randomState, exclusiveMax) -> { value, nextState }`. It must be a pure operation on explicit state. A pinned local seeded implementation lives in domain/random; tests may inject scripted draws. W1 specifies the algorithm/version, seed normalization, unbiased bounded sampling, and golden vectors before gameplay implementation. Setup is the only consumer initially.

Keep seed, algorithm version, cursor/state, rules version, initial roster, and ordered accepted domain commands (including expiries) for server-side reproduction. No Math.random, ambient clocks, unordered iteration, locale-dependent ordering, or network calls in domain. Identical inputs and versions reproduce identical state and events. Seeds come from server crypto; security credentials use independent crypto, never this game PRNG.

Invariants: balances stay integer and in range; IDs unique; exactly one active actor or pending target; only living players in actionable positions; queue advances once per turn; winner is the sole survivor; finished state rejects all gameplay commands; rejected decisions consume no randomness. Domain legal-intent queries reuse rule validators and reveal no opponent funding. UI may display these results but must not recalculate eligibility or outcomes.

## Extension seams

Keep Strike resolution in rules/strike, Recover in rules/recover, and victory evaluation in rules/victory. Phase dispatch calls these concrete modules; no plugin registry or rules DSL. Adding a proven action may extend the command union, dispatcher, legal-intent query, and its own tests. It must not require unrelated UI, networking, or storage rules. Add multi-rule victory composition only when a second victory condition is approved.
