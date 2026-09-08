# Product vision

Status: Phase 0 proposal, 2026-09-08. Architecture and provisional rules require review before implementation. Start with [ARCHITECTURE.md](ARCHITECTURE.md), then review [GAME_RULES_MVP.md](GAME_RULES_MVP.md) and [VERTICAL_SLICE_BACKLOG.md](VERTICAL_SLICE_BACKLOG.md).

## Promise

A small multiplayer bluff game where reading another player's intent matters more than memorizing rules. Players can threaten, defend, and call a bluff. Digital play supplies private commitments, correct information boundaries, timed reactions, and an ordered reveal without requiring a referee.

## Scope

- Eventual target: 4–6 players, 15–25 minutes, about four primary actions and two resources.
- First slice: 2–6 supported seats so two people can debug; use four people for the first meaningful playtest. Two primary actions, two resources, one elimination victory rule.
- Prove room creation, joining, private/public views, a concealed Strike, a defensive choice, reveal, resolution, and round rollover. Continue the same loop to a winner.
- Sequential turns with one target reacting. Simultaneous selection is deferred until playtests justify its additional timing and conflict rules.
- No ambitions, alternate victories, Deal, traps, counters, economy beyond Power, ranking, accounts, progression, cosmetics, AI opponents, or production deployment.

## Playtest questions

Can a new player explain Strike and Challenge after one practice exchange? Do players bluff and challenge voluntarily? Does Guard feel useful without making attacking futile? Can observers follow who may act? Does elimination create too much waiting?

After each of the first five four-player matches, record duration, rounds, time to first elimination, Strike/Guard/Challenge counts, bluff frequency, and short player comments. Local facilitator notes are enough; no analytics platform. The duration target is a hypothesis, not a promise or an artificial time limit.

Continue only if players understand the interaction and want another match. Repeated stalemates or an obviously dominant strategy trigger a rules revision before adding content. Add the next primary action only to address an observed missing decision; alternate victory paths follow a successful core-loop test.

## Review decisions and risks

| Decision to settle before workers start | Recommendation / implication |
| --- | --- |
| What counts as bluffing? | Secretly fund a claimed Strike or fake it; target may challenge. See exact matrix in the rules. |
| First-slice scope | Two actions; three reaction choices. Do not fill an arbitrary four-action quota yet. |
| Turn structure | Sequential active player and one target. Future simultaneity requires an explicit rules change. |
| Victory | Last surviving player. No score, ambition, or tiebreak economy. |
| Information | Power and Influence public; Strike funding hidden until reveal. Seed and random cursor server-only. |
| Match continuity | One server process and in-memory rooms; restart loses matches. Reconnect supported while process lives. |
| Timing | 45-second action window, 20-second reaction window; expiry passes/yields. Balance values are provisional. |
| Rule balance | Guard may cause stalling; false claims must carry meaningful challenge risk. Test before expanding. |
| Security boundary | Room membership credentials bind commands to a seat. Room codes alone are not credentials. |

Accepting the foundation freezes contracts for the first slice, not permanent balance. Workers must escalate contract changes to the lead architect with affected tests and documents; they must not redesign the loop independently.
