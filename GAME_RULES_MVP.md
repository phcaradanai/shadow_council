# MVP rules — Gameplay Rules v0.2.3

These are the authoritative playtest rules for Shadow Council. [MATCH_STATE_MACHINE.md](MATCH_STATE_MACHINE.md) defines execution; this file owns balance numbers and outcomes.

## Teach the game

Keep your **Influence** above zero. Influence is public; **Power** is private.

On your turn choose one action:

1. **Strike** — publicly declare Threat 1–3 and secretly commit Force.
2. **Recover** — gain +2 Power, up to 3.
3. **Scheme** — spend 1 Power to secretly prepare Ambush or Bulwark.

When attacked you build a **Defense Plan**: choose Guard 0–3 and optionally add a Challenge. The last living player wins.

## Setup

- 2–6 players.
- Each player starts at **3 Influence** and **2 Power**.
- Influence range: 0–3 and public.
- Power range: 0–3 and visible only to its owner.
- Seat order is seeded once at setup.
- Zero Influence eliminates the player immediately.

## Strike: Threat vs Force

A Strike commits target, public Threat, and secret Force at the same time.

- **Threat**: 1, 2, or 3. This is the public claim.
- **Force**: 0 through Threat, limited by the attacker's current Power.
- Invariant: `0 <= Force <= Threat`.
- **Pure bluff**: Force = 0.
- **Partial bluff**: 0 < Force < Threat.
- **Fully backed**: Force = Threat.
- Force above Threat is illegal.

The attacker spends committed Force at resolution. Other players never receive the pending Force before reveal.

## Recover

- Legal below 3 Power.
- Gain +2 Power, capped at 3.
- Ends the turn.

## Scheme

Spend 1 Power and secretly prepare one Scheme. Other players know a Scheme is armed but not its type.

- **Ambush** — when you Challenge and correctly catch an underfunded Strike, attacker loses 2 Influence total instead of 1.
- **Bulwark** — when you use Guard, effective Guard is increased by +1.
- Maximum one armed Scheme.
- Ambush is consumed when Challenge is used.
- Bulwark is consumed when Guard is used.
- An unrelated reaction does not consume the Scheme.

## Defense Plan

The target submits one plan:

```text
Guard: 0 | 1 | 2 | 3
Challenge: yes | no
```

Power cost:

```text
Guard + (Challenge ? 1 : 0)
```

The total cost cannot exceed the target's current Power.

This creates four strategic forms:

- Guard 0 + no Challenge = **Yield**
- Guard > 0 + no Challenge = **pure Guard**
- Guard 0 + Challenge = **pure Challenge**
- Guard > 0 + Challenge = **hybrid defense**

All commitments are locked before Force is revealed.

## Resolution

### Yield

`Guard 0 + Challenge off`

- Cost: 0 Power.
- Target loses exactly **1 Influence**, regardless of Threat or Force.
- This is the predictable, resource-saving option.

### Pure Guard

`Guard G + Challenge off`

- Target spends G Power.
- Attacker spends Force.
- Effective Guard is G, or G+1 when Bulwark triggers.
- Target damage: `max(0, Force - effectiveGuard)`.

### Pure Challenge

`Guard 0 + Challenge on`

Challenge means: **"I believe Force is lower than Threat."**

- Cost: 1 Power.
- If `Force < Threat`: attack is caught as a bluff; target takes 0, attacker loses 1 Influence. Ambush makes this 2 total.
- If `Force == Threat`: Challenge fails; target loses exactly **2 Influence**.

A normal failed Challenge never deals Threat+1 damage.

### Hybrid Guard + Challenge

`Guard G + Challenge on`

- Target spends G + 1 Power.
- If `Force < Threat`: Challenge succeeds; target takes 0, attacker is punished. The Guard commitment is still spent.
- If `Force == Threat`: Challenge fails, but Guard cushions the fixed 2-damage punishment.
- Damage on failed hybrid Challenge: `max(0, 2 - effectiveGuard)`.

Example: target has 3 Influence and 2 Power, chooses Guard 1 + Challenge against Threat 2 / Force 2. The call is wrong, but Guard absorbs 1 of the 2 danger: target loses only 1 Influence and ends at 2.

## Information model

### Public

- Influence
- alive/eliminated
- active player and target
- declared Threat
- whether a Scheme is armed
- revealed historical Threat/Force/reactions
- public outcomes

### Private

- current Power balance
- pending Force
- Scheme type before it triggers
- uncommitted player choices

Bots must obey the same information boundary. Bot difficulty changes policy only, never access to hidden truth or resolution.

## Timing

The room host configures whether decision timers are enabled and, when enabled, their duration.

- Timer enabled: server-authoritative deadlines apply to ACTIVE_TURN and REACTION.
- Timer disabled: no automatic phase deadline.
- Active-turn expiry passes the turn.
- Reaction expiry submits Yield: Guard 0, Challenge off.
- Reconnect restores the same permitted public/private projection.

## Resolution protocol

1. Lock attacker Threat + Force.
2. Lock defender Guard + Challenge.
3. Reveal Force.
4. Spend committed Power.
5. Resolve Challenge if present.
6. Apply Guard mitigation.
7. Apply matching Scheme modifier.
8. Apply Influence loss.
9. Check elimination and victory atomically.
10. Advance the turn if the match continues.

Invalid input changes nothing.

## Worked examples

### Partial bluff caught

A declares Threat 3 / Force 1. B chooses Guard 0 + Challenge.

- A spends 1 Power.
- B spends 1 Power for Challenge.
- Force < Threat, so A loses 1 Influence.
- B loses no Influence.

### Wrong read with insurance

A declares Threat 2 / Force 2. B has 2 Power and chooses Guard 1 + Challenge.

- B spends 2 Power total.
- Force == Threat, so Challenge fails.
- Base danger is 2.
- Guard 1 reduces it to 1.
- B loses 1 Influence.

### Bluff wastes defense

A declares Threat 3 / Force 0. B chooses Guard 2 without Challenge.

- A spends 0.
- B spends 2.
- Damage is 0.
- The bluff gained economic value even though it dealt no Influence damage.
