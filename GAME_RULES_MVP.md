# MVP rules — provisional v0.1

These are proposed playtest rules, not previously approved game design. [MATCH_STATE_MACHINE.md](MATCH_STATE_MACHINE.md) defines execution; this file owns balance numbers and outcomes.

## Teach the game

Keep your Influence above zero. On your turn, recover Power or claim a Strike against someone. A Strike can be real or a bluff. Its target can pay to Guard, Challenge the claim, or Yield. The last player with Influence wins.

## Setup and rounds

- Start with 2–6 players, each at 3 Influence and 2 Power. Influence is public (0–3). Power is private (0–3): each player sees only their own Power reserve; opponents' Power balances are hidden (`🔒 ?`).
- Seeded shuffle fixes seat order once at setup. No roles, hands, decks, or additional random draws in v0.1.
- At round start, queue all living players in seat order. Each gets one turn. Skip anyone eliminated before their queued turn. A round ends when this queue is exhausted.
- Starting with round two, use the same order. There is no automatic resource income or healing.
- At zero Influence, a player is eliminated and cannot act or react. Connected eliminated players may watch public state.

## Primary actions

| Action | Intent and validation | Effect |
| --- | --- | --- |
| Strike | Choose a different living target and privately commit `funding: 0 \| 1`. Funding 1 requires at least 1 Power; funding 0 costs nothing. | Announce attacker, target, and claimed Strike. Freeze the choice; target reacts. |
| Recover | No target; requires Power below 3. | Gain 1 Power and end the turn. |

Funding 1 is a genuine Strike; funding 0 is a bluff. A bluff accepted without challenge still inflicts 1 Influence loss: the target yields to the threat. This is the core bluff incentive, not a strength-comparison system.

Power balances remain strictly private. The server reserves the commitment logically; no other action may spend the attacker's Power during this window. Deduct funding only at resolution, regardless of the reaction. While a player with 0 Power can only bluff, opponents cannot see their Power balance directly and must deduce it from past actions.

## Reactions and exact resolution

Only the named living target may react, once, within the reaction window. Guard requires at least 1 Power and costs 1 Power regardless of truth. Challenge and Yield are free.

| Target choice | Genuine Strike: funding 1 | Bluff: funding 0 |
| --- | --- | --- |
| Guard | Attacker pays 1 Power; target pays 1 Power; no Influence loss. | Attacker pays 0; target pays 1 Power; no Influence loss. |
| Challenge | Attacker pays 1 Power; target loses 2 Influence total. | Attacker pays 0; attacker loses 1 Influence; target unharmed. |
| Yield | Attacker pays 1 Power; target loses 1 Influence. | Attacker pays 0; target loses 1 Influence. |

Reveal funding after the reaction is accepted, including after Guard or Yield. No opportunity to change either decision after seeing the reveal. Clamp Influence loss at zero. No counter-reaction, refund, resource transfer, or extra damage beyond this table. A bluff succeeds when not challenged, including when it induces a paid Guard.

Resolve resource costs, Influence loss, elimination, and victory atomically. If exactly one player lives, finish immediately; do not give a dead target a reaction or start another round. The table can eliminate only one player per exchange; a draw cannot arise from valid v0.1 play. A future rule allowing mutual elimination must define draws before integration.

## Timing, room settings, disconnections, and invalid input

- **Configurable Room Turn Timer**:
  - The room host may configure whether decision time is limited in the Lobby before match start.
  - **When Enabled**: Configured duration (30s, 45s default, 60s, or 90s) applies to player decision phases (`ACTIVE_TURN` and `REACTION`). The server is authoritative over deadlines.
  - **When Disabled**: No deadlines are scheduled (`deadlineAt` is `undefined`), the client displays `⏱️ No Time Limit` (`⏱️ ไม่จำกัดเวลา`), and matches allow deliberate, untimed play.
  - Settings are snapshotted at match start and preserved across rematches.
- **Expiry Fallbacks** (when timer is enabled):
  - Action deadline expiry passes the turn with no resource effect; Pass is a system fallback, not a third player action.
  - Reaction deadline expiry chooses Yield, even if Guard was affordable.
- **Disconnections**: Disconnect does not pause, eliminate, or choose an action. The configured deadline (if any) continues to apply. Reconnect restores the seat and its permitted view.
- Invalid intents change nothing and do not extend a deadline. Late, duplicate, and concurrent requests follow the application contract.
- No forced round limit or winner on abandonment. Mutual Recover/Guard or disconnected players can stall; this is a measured playtest risk. Closing an abandoned room is session cleanup, not a gameplay victory.

## Worked exchange

A has 3 Influence and 2 Power. B has 3 Influence and 1 Power. Neither knows the other's exact Power. A claims Strike on B with funding 0. Everyone sees the claim but only A and the server see funding. B Guards (spending 1 Power). Reveal funding 0; B now has 0 Power, both keep 3 Influence, and the next living queued player acts. Had B Challenged, A would instead lose 1 Influence and B would retain 1 Power.
