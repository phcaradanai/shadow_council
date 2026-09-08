# Core loop study — Gameplay Design v0.1

Status: proposal for Lead Architect review, 2026-09-08. This document evaluates gameplay; it does not replace the execution contracts in `GAME_RULES_MVP.md` or `MATCH_STATE_MACHINE.md` until approved.

## Design conclusion

Prototype **Veiled Force** first. On a turn, the attacker announces a credible threat from 1–3, but secretly funds any amount from zero up to that threat. The defender may Yield, Call, or secretly Brace 1–3. A correct Call or exact Brace scores for the defender; a successful threat scores for the attacker. Players race for Renown and are never eliminated.

This is the smallest tested concept here that makes both sides read the other player. Its only arithmetic is comparing two numbers from 0–3. It has two actions, two resources, one concealed value, one reaction decision, and one victory track. Negotiation remains free conversation rather than an action or phase.

## Variant A — Call the Strike

1. **Core idea.** The active player claims a Strike and secretly makes it genuine for 1 Power or bluffs for 0. The target chooses Yield, Guard, or Challenge before the funding is revealed.
2. **Player objective.** Be the last player with Resolve.
3. **Resources.** Resolve (3, public) and Power (start 2, maximum 3, public).
4. **Available actions.** Strike or Recover. A Strike opens the three target reactions.
5. **Public information.** Resolve, Power, turn order, attacker, target, the Strike claim, and all previous reveals.
6. **Hidden information.** Whether the pending Strike is funded.
7. **How bluffing works.** An unfunded Strike still deals 1 Resolve if the target Yields. A Challenge catches it and costs the attacker 1 Resolve.
8. **Defense/counterplay.** Yield saves Power but takes 1 damage. Guard spends 1 Power and blocks either kind of Strike. Challenge is free: it punishes a bluff, but a genuine Strike deals 2 damage.
9. **Round flow.** In fixed seat order: choose action → if Strike, target reacts → reveal → resolve. There is no separate negotiation phase.
10. **Victory.** Last player with Resolve wins.
11. **Complete interaction.** Ari has 2 Power and secretly funds 0 while claiming a Strike on Bo. Bo expects Ari to conserve Power and Challenges. The reveal shows 0; Ari loses 1 Resolve, Bo spends nothing, and play advances.
12. **Why it should be fun.** The whole exchange asks one clean question: “Did they pay for it?” Challenges create sharp, public reveal moments.
13. **Main weakness/risk.** Guard is safe but not expressive, bluff depth is binary, zero Power makes a bluff obvious, and elimination can leave a player watching. Repeated Strike/Recover turns may become solved by probability rather than personality.
14. **Estimated rule complexity.** **2/5**; roughly a two-minute teach plus one example.

## Variant B — Veiled Force

1. **Core idea.** The attacker publicly announces a credible Threat of 1–3 and privately commits Force from 0 up to that Threat. The defender chooses whether to Yield, Call an underfunded claim, or secretly Brace a specific amount. Exact defense is rewarded; over-defense and under-defense have different costs.
2. **Player objective.** Reach the end-of-round victory check as the unique player with the most Renown, with at least 5 Renown.
3. **Resources.** Renown (public score) and Power (start 3, maximum 5, public).
4. **Available actions.** Press or Regroup. Press opens Yield, Call, and Brace reactions.
5. **Public information.** Renown, Power, turn and round order, attacker, target, announced Threat, and the complete history of prior reveals.
6. **Hidden information.** The attacker’s committed Force and, during a Brace, the defender’s committed defense. No hidden state survives the reveal.
7. **How bluffing works.** A Threat is truthful only when Force equals Threat. Force may be zero or partially funded. Yield grants the attacker 1 Renown regardless, while Call scores for the defender against any underfunded Threat and gives the attacker 2 Renown against a fully funded Threat.
8. **Defense/counterplay.** Yield avoids Power loss and the risk of a disastrous Call. Brace spends 1–3 Power: under-defense lets the attacker score, an exact match gives the defender 1 Renown, and over-defense prevents a score but wastes Power. Call spends no Power and tests whether the whole claim is real.
9. **Round flow.** In rotating seat order: choose Press or Regroup → if Press, reveal its public Threat → target reacts → reveal hidden commitments → resolve. At the end of the full round, check victory.
10. **Victory.** At round end, a player with at least 5 Renown wins if they are the unique Renown leader. A tie for highest continues the match.
11. **Complete interaction.** Cy announces Threat 3 against Dev but commits Force 1. Dev thinks the threat is partly real and Braces 1 rather than Calling. Both commitments reveal as 1. Each spends 1 Power and Dev gains 1 Renown for the exact read. If Dev had Braced 2, the attack would still fail, but nobody would score and Dev would waste an extra Power.
12. **Why it should be fun.** Every Threat supports several plausible stories. Partial funding can beat a cheap Brace while remaining vulnerable to a Call. The defender can score through a precise read, so defense feels like a play rather than a stop button.
13. **Main weakness/risk.** Comparing Threat, Force, and Brace is harder than a binary claim. Exact Brace rewards may prove too difficult, and non-scoring over-defense can lengthen matches. A losing target can still influence who scores near the end.
14. **Estimated rule complexity.** **3/5**; roughly a four-minute teach plus one open example.

## Variant C — Secret Orders

1. **Core idea.** At the start of each round, everyone publicly claims an order. After table talk, everyone secretly commits an actual order, which may differ. Orders reveal and resolve together.
2. **Player objective.** Finish a round as the unique player with at least 5 Renown and the highest Renown.
3. **Resources.** Renown (public score) and Power (start 3, maximum 5, public).
4. **Available actions.** Strike a player, Guard any player, Expose a player whose actual order differs from their claim, or Regroup.
5. **Public information.** Renown, Power, public claims, and all prior resolved orders.
6. **Hidden information.** Every actual order and target until the simultaneous reveal.
7. **How bluffing works.** Claims are system-recorded but nonbinding. A lie can misdirect Guards and Strikes, but an Expose aimed at a liar scores 1 Renown.
8. **Defense/counterplay.** Guard blocks Strikes against its chosen player and scores if it blocks at least one. Expose punishes a false claim. Players may defend themselves, protect an ally, or announce protection they do not actually commit.
9. **Round flow.** Simultaneous public claim → open negotiation → simultaneous secret commitment → reveal → Expose resolution → Guard/Strike resolution → Regroup → victory check.
10. **Victory.** At round end, a unique Renown leader at 5 or more wins; tied leaders continue.
11. **Complete interaction.** Eli publicly claims Regroup. Farah claims she will Guard Eli. Eli actually Strikes Gus, while Farah Exposes Eli instead of Guarding. On reveal, Farah scores because Eli lied; Eli’s unguarded Strike also scores. Both public statements shaped the round, and neither was binding.
12. **Why it should be fun.** All players talk, commit, and reveal together. Alliances, misdirection, protection, and second-order reads emerge without waiting for a single duel to finish.
13. **Main weakness/risk.** It spends complexity on simultaneous conflict rules, multi-player targeting, and claim bookkeeping. Six-player reveals can become noisy, and coordinated players can feed Guard or Strike points. Its bluffing depends more heavily on table talk.
14. **Estimated rule complexity.** **4/5**; a six- to eight-minute teach before edge cases.

## Mechanic audit

“Low” is desirable in the four risk columns. Decision, bluff, counterplay, and digital ratings describe the value created by that mechanic rather than the whole variant.

| Mechanic | Learnability | Decision value | Bluff value | Counterplay | Downtime | Snowball | Kingmaking | Randomness | Digital value |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A: binary funded Strike | Very high | Medium | High | High | Low | Medium | Medium | None | High |
| A: Yield / Guard / Challenge | High | High | High | High | Low | Low | Medium | None | Medium |
| A: Recover | Very high | Low | Low; restores credibility | Medium | Low | Medium | Low | None | Low |
| A: Resolve elimination | Very high | Medium | Medium; stakes the read | Low | High after elimination | High | High | None | Low |
| B: Threat plus hidden Force | High | Very high | Very high | Very high | Low | Low | Medium | None | Very high |
| B: Yield / Call / exact Brace | Medium-high | Very high | Very high | Very high | Low | Low | Medium | None | High |
| B: Regroup | Very high | Medium; trades tempo for credibility | Medium | Medium | Low | Low | Low | None | Low |
| B: end-of-round Renown race | High | High | Medium; leaders alter reads | High | None | Low; score grants no power | Medium | None | Medium |
| C: public claim / secret order | Medium | High | High | High | Medium | Low | High | None | Very high |
| C: simultaneous Strike / Guard | Medium | High | Medium | High | Very low | Medium | High | None | Very high |
| C: Expose | Medium | High | Very high | High | Very low | Low | Medium | None | High |
| C: Regroup and Renown race | High | Medium | Low | Medium | Very low | Low | Medium | None | Medium |

No variant needs random resolution. Uncertainty comes from player commitments and claims, while public balances and reveal history give players evidence for later reads.

## Comparison

| Variant | Learnability | Bluff depth | Aggressive play | Defensive play | Social interaction | Replayability | Digital advantage | Balance potential | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A. Call the Strike | 10 | 7 | 8 | 6 | 7 | 6 | 7 | 7 | **58** |
| B. Veiled Force | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 8 | **69** |
| C. Secret Orders | 6 | 7 | 7 | 8 | 9 | 8 | 10 | 5 | **60** |

### Recommendation

**Veiled Force is the recommended MVP.** Variant A is easier by one comparison rule, but that saving removes the defender’s most interesting choice: how much of the threat to respect. It also requires elimination to make defensive reads matter, while Veiled Force lets correct defense advance a player toward victory. Variant C creates more table-wide stories, but it needs simultaneous resolution precedence, claim and target comparisons, protection collisions, and stronger anti-collusion work before its central bluff can be judged.

Veiled Force retains Variant A’s best property: one attacker, one target, one private commitment, and an immediate reveal. Threat sizing creates depth without cards, roles, factions, or exception powers. The Renown race prevents early elimination and keeps the victory state public. Power creates tempo and credibility but never increases damage or Renown by itself, which limits snowballing.

Strike, Guard, Scheme, and Deal should not be four peer actions in the MVP. Press contains Strike and bluffing; Brace and Call make Guard active; partial Force supplies the useful part of Scheme; conversation supplies Deal without a dedicated transaction system.

## Playable MVP rules — Veiled Force

### One-sentence pitch

Announce how hard you are pressing someone, secretly decide how much Power is real, and see whether they yield, call the bluff, or match your force exactly.

### Setup

- Use four players for the first meaningful playtest. The rules support 3–6, but balance targets begin at four.
- Randomize seats. Round 1 starts with seat 1; each later round starts one seat clockwise from the prior starting seat.
- Each player starts at **0 Renown** and **3 Power**. Power cannot exceed **5**. Both values are public.
- Set the victory threshold to **5 Renown**.
- There are no hands, roles, dice, maps, ambitions, or player elimination.

### Round and turn flow

Each player takes exactly one turn per round, proceeding clockwise from that round’s starting seat. On a turn, choose **Press** or **Regroup**.

1. **Commit.** For Press, the attacker submits target, public Threat, and hidden Force together. The choice freezes.
2. **React.** The target chooses Yield, Call, or Brace. A Brace amount is hidden until reveal.
3. **Reveal.** Show Force and any Brace amount at the same time.
4. **Resolve.** Spend Power and award Renown from the resolution table.
5. **Advance.** After every player has acted, check victory and rotate the starting seat.

Players may negotiate at any time while an action or reaction timer is open. Promises are public or private social statements and are never enforced by the rules.

### Actions

**Press**

- Choose another player as target.
- Announce Threat 1, 2, or 3. Threat cannot exceed the attacker’s current Power, so every legal claim could be fully funded.
- Secretly commit Force from 0 through Threat. Force is reserved immediately and spent at resolution.
- A Force below Threat is an underfunded claim, including a pure bluff at Force 0.

**Regroup**

- Gain 2 Power, stopping at the maximum of 5.
- Regroup is illegal at 5 Power. At 0 Power, it is the only legal action.
- Regroup ends the turn and creates no reaction.

### Reactions and resolution

The target chooses exactly one reaction without seeing Force.

| Reaction | Cost | Result |
| --- | ---: | --- |
| **Yield** | 0 | Attacker gains 1 Renown. |
| **Call** | 0 | If Force is below Threat, defender gains 1 Renown. If Force equals Threat, attacker gains 2 Renown. |
| **Brace D** | D Power, where D is 1–3 | If Force > D, attacker gains 1 Renown. If Force = D, defender gains 1 Renown. If Force < D, nobody gains Renown. |

After determining the result, the attacker spends Force and a Bracing defender spends D. Costs apply even when nobody scores. No player can gain Renown from both sides of one Press.

The reaction options have distinct purposes:

- Yield preserves Power and avoids risking a 2-point Call.
- Call tests whether the entire public claim is true.
- Brace tests the actual Force and can block safely, but only an exact read scores.

### Victory

Finish every turn in the round. At round end:

- If nobody has 5 Renown, begin the next round.
- If one player has at least 5 Renown and strictly more than everyone else, that player wins.
- If two or more players tie for the highest Renown at 5 or more, play another complete round. All players remain eligible to win.

This check gives every seat the same number of active turns. Rotating the starting seat reduces the information advantage of acting late.

### Timing and disconnect defaults

- Active turn: 30 seconds. Timeout performs Regroup if legal; at 5 Power it performs a Press with Threat 1, Force 1, against the next player clockwise.
- Reaction: 15 seconds. Timeout chooses Yield.
- A disconnect does not pause play. Reconnection restores the player’s current public view and any private choice they are still allowed to see.

The forced Press default prevents a full-Power disconnected player from stalling forever. It is deterministic and therefore suitable for replay and simulation.

### Edge cases fixed for the first playtest

- A player cannot target themselves.
- Threat must be legal when submitted. A pending Force is reserved, so it cannot be spent twice.
- Brace must be affordable when submitted and cannot exceed 3.
- Threat, Force, and Brace cannot be revised after submission.
- Force and Brace reveal together; network timing reveals neither choice early.
- Power changes become public during resolution. There is no persistent hidden resource balance.
- Renown never decreases and has no maximum.
- Several players may finish above 5; only the unique highest wins.
- A player may target the same opponent on consecutive turns. Focused targeting does not remove turns or resources from the target beyond any voluntary Brace.
- Promises, alliances, and trades have no binding game effect. Power and Renown cannot be transferred.
- Invalid or late input changes nothing and does not extend a timer.

## Ten play situations and what they reveal

### 1. Successful bluff

Ari has 3 Power and announces Threat 3 against Bo with Force 0. Bo Yields. Ari spends nothing and gains 1 Renown.

**Finding:** The bluff has a direct reward without requiring Bo to believe a spoken story. Threat 3 from only 3 Power may look suspicious enough to keep the free score from becoming automatic.

### 2. Failed bluff

Ari announces Threat 2 with Force 1. Bo Calls. Since 1 is below 2, Ari spends 1 Power and Bo gains 1 Renown.

**Finding:** Partial funding remains a bluff for Call purposes. That single definition must appear in the teach; otherwise players may assume any positive Force is “real.”

### 3. Over-defense

Cy announces Threat 3 with Force 1. Dev Braces 3. Cy spends 1, Dev spends 3, and nobody scores.

**Finding:** Over-defense prevents the opponent’s progress but sacrifices future options. If too many exchanges end this way, reduce Power recovery or let only Brace 1–2 exist before changing scoring.

### 4. Under-defense

Cy announces Threat 3 with Force 2. Dev Braces 1. Both spend their commitments and Cy gains 1 Renown.

**Finding:** A defender can make a cautious, informed bet rather than choose between total safety and a naked challenge.

### 5. Exact counterplay

Eli announces Threat 2 with Force 2. Farah Braces 2. Both spend 2 Power and Farah gains 1 Renown.

**Finding:** A fully truthful attack is not automatically successful. Defense can advance its own victory plan through a precise read.

### 6. Aggressive pressure

Gia has 5 Power and 3 Renown. She announces Threat 3 with Force 3. Hale believes the large spend is a bluff and Calls. Gia spends 3 and gains 2 Renown.

**Finding:** A costly full commitment creates a visible finish threat and punishes habitual Calling. The 2-point result is the sharpest swing in the game and should be watched for abrupt endings.

### 7. Defensive trap

Hale repeatedly tells Gia he will Yield to conserve Power. When Gia announces Threat 2 with Force 1, Hale secretly Braces 1. The values match, so Hale gains 1 Renown.

**Finding:** A defensive player can bluff about the reaction and set a trap. The rules do not need a separate Trap action.

### 8. Negotiation

Inez asks Jun not to target her and promises to Yield on Jun’s next Press. Jun agrees, then announces Threat 2 with Force 0. Inez breaks the promise and Calls, gaining 1 Renown.

**Finding:** Deals already exist through conversation. Making them binding would remove the betrayal and add unnecessary rules. This also exposes collusion and spite as playtest risks.

### 9. Comeback

Kai leads with 4 Renown; Lio has 1. Kai announces Threat 3 with Force 0 against Lio, who Calls and rises to 2. On Lio’s turn, Lio fully funds Threat 3 against Kai. Kai Calls and Lio gains 2 more, reaching 4.

**Finding:** Renown gives no combat bonus, so a leader remains readable and punishable. A player can recover through two excellent reads, although the second swing depends on the opponent choosing Call.

### 10. Near-victory tension

On the last turn of a round, Ari and Bo each have 4 Renown and Cy has 3. Cy announces Threat 2 against Ari. Ari knows that Calling an underfunded claim gives Ari 5, while Calling a fully funded claim gives Cy 5. Ari must decide whether Cy is helping, attacking, or baiting a read; Bo watches because the winner is checked after this reveal.

**Finding:** The victory threat is public and the decisive uncertainty is understandable. A target can still determine which rival scores, so kingmaking must be observed rather than denied.

## Playtest risks and stop conditions

The scenarios expose five issues worth measuring before adding any action:

1. **Call frequency.** If Call dominates Yield and Brace, increase the full-claim reward or make Threat sizing costlier. Do not add cards.
2. **Exact Brace difficulty.** If exact matches are rare or feel lucky, compare informed players against first-time players. The evidence available is public Power, past Force, Threat size, score pressure, and negotiation.
3. **Empty resolutions.** If over-defense creates too many scoreless turns, first test a lower Power cap or Brace maximum of 2.
4. **Endgame kingmaking.** Record whether losing players make defensible reads or arbitrarily feed a leader. A final-round check reduces seat advantage but does not solve collusion.
5. **Match duration.** A 5-Renown threshold should produce about 5–8 rounds. If four-player games routinely exceed 25 minutes, shorten timers before changing outcomes.

Do not add Scheme, Deal, ambitions, or alternate victories until players voluntarily vary Force, discuss reactions, and ask for a rematch.

## Instrumentation for a rules simulation and playtest

Record only events needed to answer gameplay questions:

- match duration, rounds, turns, and winner seat;
- Press and Regroup counts;
- Threat, Force, reaction, and Brace distributions;
- bluff rate (`Force < Threat`) and pure-bluff rate (`Force = 0`);
- Yield, Call, exact-Brace, over-defense, and under-defense rates;
- Renown gained from Press, Call, and Brace;
- Power at each decision and average Power by round;
- leader after each round, lead changes, comeback wins, and tied overtime rounds;
- score by seat and by aggressive/defensive source;
- target concentration and points awarded by players already far behind.

Useful first flags are Call above 55% of reactions, exact Brace below 10%, more than 30% scoreless Presses, fewer than two lead changes per match, a seat win rate outside 15–35% in four-player tests, or average duration outside 15–25 minutes. These are investigation triggers, not balance truths.

## Future victory paths and Secret Ambitions

The public Renown race can later express aggressive and defensive styles through **how** points are earned, so a second public victory track is unnecessary. If a second path is eventually justified, test one public threshold tied to table-wide influence rather than a new resource.

Secret Ambitions should remain bonus objectives, never instant wins. A later experiment could award 1 Renown once per match for a revealed condition such as “score once with Call and once with exact Brace” or “make two different opponents Yield.” Each condition uses events the game already records, becomes inferable from behavior, and cannot produce an unseen victory by itself. Do not include ambitions in the MVP; they would obscure whether Threat–Force–reaction is fun on its own.
