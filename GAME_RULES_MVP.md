# MVP rules — Gameplay Rules v0.2

These are authoritative gameplay rules for Shadow Council v0.2. [MATCH_STATE_MACHINE.md](MATCH_STATE_MACHINE.md) defines execution; this file owns balance numbers and outcomes.

## Teach the game

Keep your Influence above zero (0–3). Power is private (0–3). On your turn, execute one of three actions:
1. **Strike**: Publicly declare a **Threat level (1–3)** against a living target and privately commit hidden **Force (0–3)**.
2. **Recover**: Gain **+2 Power** (capped at maximum 3 Power) and end your turn.
3. **Scheme**: Privately prepare a secret posture (**Ambush** or **Bulwark**) costing 1 Power. Opponents only see that you Schemed. Triggered when you are attacked.

When attacked, the target chooses one of three tactical reactions:
1. **Yield**: Lose Influence equal to the attacker's Threat. Costs 0 Power.
2. **Challenge**: Call the attacker's bluff.
   - If `Force < Threat` (Bluff): Attacker loses 1 Influence, and target takes 0 damage.
   - If `Force >= Threat` (Honest/Overpowered): Target loses `Threat + 1` Influence, and attacker takes 0 damage.
3. **Guard(X)**: Spend `X` Power (1–3) to absorb up to `X` damage.
   - Effective incoming strike power is `min(Threat, Force)`.
   - Damage dealt to target: `max(0, min(Threat, Force) - Guard)`. Attacker takes 0 damage.

The last surviving player with Influence wins the Council.

## Setup and rounds

- Start with 2–6 players, each at 3 Influence and 2 Power. Influence is public (0–3). Power is private (0–3): each player sees only their own Power reserve; opponents' Power balances are hidden (`🔒 ?`).
- Seeded shuffle fixes seat order once at setup. No roles, hands, decks, or additional random draws.
- At round start, queue all living players in seat order. Each gets one turn. Skip anyone eliminated before their queued turn. A round ends when this queue is exhausted.
- Starting with round two, use the same order. There is no automatic resource income or healing.
- At zero Influence, a player is eliminated and cannot act or react. Connected eliminated players may watch public state.
- Prepared Schemes persist across rounds until triggered when attacked, or overwritten by a new Scheme.

## Primary actions

| Action | Intent and validation | Effect |
| --- | --- | --- |
| **Strike** | Choose a different living target, publicly declare `threat: 1 \| 2 \| 3`, and privately commit `force: 0 \| 1 \| 2 \| 3`. Requires `actor.power >= force`. | Announce attacker, target, and public Threat level. Force remains strictly concealed. Target enters Reaction phase. Attacker's committed Force power is deducted at resolution. |
| **Recover** | No target; requires `actor.power < 3`. | Gain +2 Power (clamped at cap 3) and end the turn. |
| **Scheme** | Privately choose `schemeType: "ambush" \| "bulwark"`. Requires `actor.power >= 1`. | Costs 1 Power immediately. Sets the player's active Scheme posture secretly. Publicly emits that the player Schemed (without leaking posture type). Passes turn. |

### Strike Mechanics: Threat vs Force
- **Threat (1–3)**: The public claim of attack magnitude.
- **Force (0–3)**: The actual Power committed in secret.
- **Pure Bluff**: `Force = 0` (even when Threat is 2 or 3).
- **Partial Bluff**: `Force > 0` but `Force < Threat` (e.g. Threat 3 with Force 1).
- **Honest Attack**: `Force == Threat`.
- **Overpowered Strike**: `Force > Threat` (e.g. Threat 1 with Force 2). Counts as genuine against Challenge.

### Scheme Mechanics: Ambush vs Bulwark
- Costs 1 Power when set.
- Only one active Scheme posture can be held at a time. Setting a new Scheme replaces any existing one.
- **Ambush**: When attacked, if the target chooses **Challenge** and catches the attacker bluffing (`Force < Threat`), the attacker loses an **extra +1 Influence** (total 2 Influence lost by attacker). Discarded after triggering.
- **Bulwark**: When attacked, grants **+1 free Guard absorption** on any Guard reaction (e.g. Guard 1 with Bulwark absorbs 2 damage). Discarded after triggering.
- If the target reacts with an incompatible reaction (e.g. Yields, or Guards while holding Ambush, or Challenges while holding Bulwark), the Scheme is revealed and consumed without providing its special effect.

## Reactions and exact resolution

Only the named living target may react, once, within the reaction window. Guard requires at least `X` Power (`1 <= X <= 3`) and costs `X` Power. Challenge and Yield cost 0 Power.

### Base Resolution Matrix (Before Scheme Modifiers)

| Target Choice | If Attacker Bluffed (`Force < Threat`) | If Attacker Honest/Overpowered (`Force >= Threat`) |
| --- | --- | --- |
| **Yield** | Attacker pays `Force` Power. Target loses `Threat` Influence. Attacker loses 0. | Attacker pays `Force` Power. Target loses `Threat` Influence. Attacker loses 0. |
| **Challenge** | Attacker pays `Force` Power. Attacker loses 1 Influence. Target takes 0 damage. | Attacker pays `Force` Power. Target loses `Threat + 1` Influence. Attacker takes 0 damage. |
| **Guard(X)** | Attacker pays `Force` Power; target pays `X` Power. Damage to target = `max(0, min(Threat, Force) - X)`. Attacker takes 0. | Attacker pays `Force` Power; target pays `X` Power. Damage to target = `max(0, Threat - X)`. Attacker takes 0. |

*(Note: When Force is 0, `min(Threat, 0) = 0`, so Guard(X) takes 0 damage.)*

### Scheme Modifiers During Resolution
If the target had an active Scheme when attacked, the Scheme triggers and is revealed during clash resolution:
- **Ambush Trigger**: Target chose `Challenge` AND attacker bluffed (`Force < Threat`) $\to$ Attacker loses 2 Influence total (1 base + 1 Ambush). Target takes 0.
- **Bulwark Trigger**: Target chose `Guard(X)` $\to$ Absorption becomes `X + 1`. Damage to target = `max(0, min(Threat, Force) - (X + 1))`.
- In all cases where a clash resolves against a target with an active Scheme, the Scheme is consumed and cleared.

### Resolution Protocol
- Reveal attacker's committed Force and target's Scheme (if any) atomically when reaction is committed.
- Deduct attacker's committed `Force` Power.
- Deduct target's `Guard(X)` Power (if Guard chosen).
- Clamp all Influence losses at 0.
- Check eliminations and victory atomically. If exactly one survivor remains, finish match immediately.

## Timing, room settings, disconnections, and invalid input

- **Configurable Room Turn Timer**:
  - The room host may configure whether decision time is limited in the Lobby before match start.
  - **When Enabled**: Configured duration (30s, 45s default, 60s, or 90s) applies to player decision phases (`ACTIVE_TURN` and `REACTION`). The server is authoritative over deadlines.
  - **When Disabled**: No deadlines are scheduled (`deadlineAt` is `undefined`), the client displays `⏱️ No Time Limit` (`⏱️ ไม่จำกัดเวลา`), and matches allow deliberate, untimed play.
  - Settings are snapshotted at match start and preserved across rematches.
- **Expiry Fallbacks** (when timer is enabled):
  - Action deadline expiry passes the turn with no resource effect; Pass is a system fallback, not a player action.
  - Reaction deadline expiry chooses **Yield**, even if Guard was affordable.
- **Disconnections**: Disconnect does not pause, eliminate, or choose an action. The configured deadline continues to apply. Reconnect restores seat and permitted private view.
- Invalid intents change nothing and do not extend deadlines.

## Worked exchanges

1. **Partial Bluff Punished**:
   - A (3 Inf, 2 Power) declares Strike on B with Threat 3, committing Force 1.
   - B (3 Inf, 1 Power) Challenges.
   - Resolution: `Force (1) < Threat (3)`. A is caught bluffing!
   - A pays 1 Power and loses 1 Influence (now 2 Inf, 1 Power). B takes 0 damage and retains 1 Power.

2. **Ambush Scheme Counter**:
   - B previously Schemed (Ambush, paid 1 Power).
   - A declares Strike on B with Threat 2, committing Force 0 (pure bluff).
   - B Challenges.
   - Resolution: Bluff caught. B's Ambush triggers! A loses 2 Influence (1 base + 1 Ambush).

3. **Bulwark Guard**:
   - B previously Schemed (Bulwark).
   - A declares Strike on B with Threat 3, committing Force 3.
   - B plays Guard(1) (paying 1 Power).
   - Resolution: Effective attack is 3. B's Guard is 1 + 1 (Bulwark) = 2. Damage = `3 - 2 = 1`. B loses only 1 Influence instead of 2.

